/**
 * Ticket Transfer Handler
 *
 * POST /api/v1/tickets/:ticket_id/transfer
 *
 * Permanent ownership transfer — the original user loses access completely.
 * This is the correct anti-fraud approach: no copies, no shared access.
 *
 * Atomic operation (all-or-nothing):
 * 1. Verify caller owns the ticket
 * 2. Verify ticket is valid (not used, not cancelled)
 * 3. Enforce time lock — no transfers within TRANSFER_LOCK_MINUTES of event start
 * 4. Find recipient by email
 * 5. Rotate QR nonce (old QR is now dead)
 * 6. Mutate tickets.user_id to recipient
 * 7. Write immutable audit record to ticket_transfers
 * 8. Commit — or rollback everything
 *
 * Time lock rationale:
 *   Transfers close to event start are the primary fraud vector.
 *   A bad actor could sell the same ticket twice: transfer to buyer,
 *   then screenshot the old QR and walk in first. The lock window
 *   ensures the original QR has already expired at the gate before
 *   any transfer could be attempted.
 */

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;
use chrono::Utc;

use crate::error::{AppError, Result};
use sqlx::{PgPool, Row};
use std::sync::Arc;

/// Transfers are blocked this many minutes before event start.
/// 60 minutes gives scanners time to process the crowd before
/// any last-minute transfer could create a duplicate-entry window.
const TRANSFER_LOCK_MINUTES: i64 = 60;

#[derive(Debug, Deserialize)]
pub struct TransferRequest {
    pub to_email: String,
}

#[derive(Debug, Serialize)]
pub struct TransferResponse {
    pub transfer_id: Uuid,
    pub ticket_id: String,
    pub to_email: String,
    pub transferred_at: String,
}

fn extract_user_id(headers: &HeaderMap) -> Result<Uuid> {
    headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or(AppError::Unauthorized)
}

pub async fn transfer_ticket(
    State(pool): State<Arc<PgPool>>,
    headers: HeaderMap,
    Path(ticket_id_str): Path<String>,
    Json(req): Json<TransferRequest>,
) -> Result<Json<Value>> {
    let caller_id = extract_user_id(&headers)?;

    // Validate recipient email
    let to_email = req.to_email.trim().to_lowercase();
    if to_email.is_empty() || !to_email.contains('@') {
        return Err(AppError::Validation("Valid recipient email required".into()));
    }

    // Begin atomic transaction — all steps succeed or none do
    let mut tx = pool.begin().await.map_err(AppError::Database)?;

    // STEP 1: Fetch ticket with row lock — verify ownership and status
    let ticket_row = sqlx::query(
        r#"SELECT t.id, t.ticket_id, t.event_id, t.user_id, t.status,
                  (e.date + e.time) AT TIME ZONE 'UTC' AS event_starts_at
           FROM tickets t
           JOIN events e ON e.id = t.event_id
           WHERE t.ticket_id = $1
           FOR UPDATE OF t"#, // Lock the ticket row only; events row is read-only here
    )
    .bind(&ticket_id_str)
    .fetch_optional(&mut *tx)
    .await
    .map_err(AppError::Database)?
    .ok_or_else(|| AppError::NotFound("Ticket not found".into()))?;

    let ticket_uuid: Uuid        = ticket_row.get("id");
    let event_id: Uuid           = ticket_row.get("event_id");
    let owner_id: Uuid           = ticket_row.get("user_id");
    let status: String           = ticket_row.get("status");
    let event_starts_at: chrono::DateTime<Utc> = ticket_row.get("event_starts_at");

    // STEP 2: Verify caller owns this ticket
    if owner_id != caller_id {
        return Err(AppError::Forbidden);
    }

    // STEP 3: Verify ticket is transferable
    if status != "valid" {
        return Err(AppError::BadRequest(format!(
            "Cannot transfer a ticket with status '{}'",
            status
        )));
    }

    // STEP 4: Enforce time lock — block transfers too close to event start.
    // This is the primary anti-fraud guard. A transfer within the lock window
    // means the old QR could still be used at the gate before it expires.
    let minutes_until_event = (event_starts_at - Utc::now()).num_minutes();
    if minutes_until_event < TRANSFER_LOCK_MINUTES {
        let msg = if minutes_until_event <= 0 {
            "Transfers are not allowed after the event has started".to_string()
        } else {
            format!(
                "Transfers are locked {} minutes before the event. {} minute(s) remaining until lock.",
                TRANSFER_LOCK_MINUTES,
                minutes_until_event
            )
        };
        return Err(AppError::Validation(msg));
    }

    // STEP 5: Find recipient by email
    let recipient_row = sqlx::query("SELECT id FROM users WHERE email = $1")
        .bind(&to_email)
        .fetch_optional(&mut *tx)
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound(format!("No Bukr account found for '{}'", to_email)))?;

    let recipient_id: Uuid = recipient_row.get("id");

    // Prevent self-transfer
    if recipient_id == caller_id {
        return Err(AppError::Validation("Cannot transfer ticket to yourself".into()));
    }

    // STEP 6: Rotate QR nonce — the old QR code is now permanently dead
    let new_nonce = hex::encode(rand::random::<[u8; 32]>());

    // STEP 7: Mutate ownership — this is the permanent, irreversible change
    sqlx::query(
        r#"UPDATE tickets
           SET user_id          = $2,
               qr_nonce         = $3,
               transferred_from = COALESCE(transferred_from, id),
               transferred_at   = NOW(),
               original_user_id = COALESCE(original_user_id, $4)
           WHERE id = $1 AND status = 'valid'"#,
    )
    .bind(ticket_uuid)
    .bind(recipient_id)
    .bind(&new_nonce)
    .bind(caller_id)
    .execute(&mut *tx)
    .await
    .map_err(AppError::Database)?;

    // STEP 8: Write immutable audit record
    let transfer_id: Uuid = sqlx::query_scalar(
        r#"INSERT INTO ticket_transfers
           (ticket_id, from_user_id, to_user_id, to_email, ticket_id_str, event_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id"#,
    )
    .bind(ticket_uuid)
    .bind(caller_id)
    .bind(recipient_id)
    .bind(&to_email)
    .bind(&ticket_id_str)
    .bind(event_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(AppError::Database)?;

    // STEP 9: Commit — all or nothing
    tx.commit().await.map_err(AppError::Database)?;

    tracing::info!(
        "Ticket {} transferred from {} to {} (transfer_id: {}, minutes_until_event: {})",
        ticket_id_str, caller_id, to_email, transfer_id, minutes_until_event
    );

    Ok(Json(json!({
        "status": "success",
        "data": {
            "transfer_id": transfer_id,
            "ticket_id": ticket_id_str,
            "to_email": to_email,
            "transferred_at": Utc::now().to_rfc3339()
        }
    })))
}
