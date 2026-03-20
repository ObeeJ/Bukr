// Usage Engine — handles all ticket models beyond single-use.
// Called by ScannerService after the basic status/lock checks pass.
// Single-use tickets bypass this entirely (fast path unchanged).

use chrono::Utc;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::{AppError, Result};

#[derive(Debug)]
pub enum UsageDecision {
    // Mark ticket status = 'used' (last use or single-use)
    MarkUsed { new_nonce: String },
    // Decrement usage_left, keep status = 'valid'
    Decrement { usage_left: i32, new_nonce: String },
    // Ticket window hasn't opened yet
    NotYetValid,
    // Ticket window has closed
    Expired,
    // All uses consumed and ticket is renewable — prompt user
    DepletedRenewable,
}

pub struct UsageEngine<'a> {
    pool: &'a PgPool,
}

impl<'a> UsageEngine<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    /// Evaluate what action to take on this scan.
    /// ticket_db_id is the UUID primary key (not the human-readable ticket_id string).
    pub async fn evaluate(&self, ticket_db_id: Uuid) -> Result<UsageDecision> {
        let row = sqlx::query(
            "SELECT usage_model, usage_left, is_renewable, valid_from, valid_until
             FROM tickets WHERE id = $1",
        )
        .bind(ticket_db_id)
        .fetch_one(self.pool)
        .await
        .map_err(AppError::Database)?;

        let model: String = row.get("usage_model");
        let usage_left: Option<i32> = row.get("usage_left");
        let is_renewable: bool = row.get("is_renewable");
        let valid_from: Option<chrono::DateTime<Utc>> = row.get("valid_from");
        let valid_until: Option<chrono::DateTime<Utc>> = row.get("valid_until");
        let now = Utc::now();

        // Time-bound check applies to all models
        if let Some(from) = valid_from {
            if now < from {
                return Ok(UsageDecision::NotYetValid);
            }
        }
        if let Some(until) = valid_until {
            if now > until {
                return Ok(UsageDecision::Expired);
            }
        }

        let new_nonce = hex::encode(rand::random::<[u8; 32]>());

        match model.as_str() {
            // Single-use and consumable: one scan = done
            "single" | "consumable" => Ok(UsageDecision::MarkUsed { new_nonce }),

            // Multi-use, subscription, renewable, time_bound: decrement
            _ => {
                let left = usage_left.unwrap_or(1);
                if left <= 1 {
                    if is_renewable {
                        return Ok(UsageDecision::DepletedRenewable);
                    }
                    return Ok(UsageDecision::MarkUsed { new_nonce });
                }
                Ok(UsageDecision::Decrement { usage_left: left - 1, new_nonce })
            }
        }
    }

    /// Apply the decision atomically. Returns usage_left_after for the scan log.
    /// Negative values are sentinel codes: -1 = not yet valid, -2 = expired, -3 = depleted renewable.
    pub async fn apply(
        &self,
        ticket_db_id: Uuid,
        ticket_id_str: &str,
        event_id: Uuid,
        scanned_by: Option<Uuid>,
        decision: &UsageDecision,
    ) -> Result<i32> {
        match decision {
            UsageDecision::MarkUsed { new_nonce } => {
                sqlx::query(
                    "UPDATE tickets SET status='used', scanned_at=NOW(), scanned_by=$2, qr_nonce=$3
                     WHERE id=$1 AND status='valid'",
                )
                .bind(ticket_db_id)
                .bind(scanned_by)
                .bind(new_nonce)
                .execute(self.pool)
                .await
                .map_err(AppError::Database)?;

                self.write_scan_log(ticket_id_str, event_id, scanned_by, "valid", Some(0)).await;
                Ok(0)
            }

            UsageDecision::Decrement { usage_left, new_nonce } => {
                // Fetch usage_left before decrement for usage_events log
                let before: i32 = usage_left + 1;

                sqlx::query(
                    "UPDATE tickets SET usage_left=$2, qr_nonce=$3, updated_at=NOW()
                     WHERE id=$1 AND status='valid'",
                )
                .bind(ticket_db_id)
                .bind(usage_left)
                .bind(new_nonce)
                .execute(self.pool)
                .await
                .map_err(AppError::Database)?;

                // Write granular usage event
                let _ = sqlx::query(
                    "INSERT INTO usage_events (ticket_id, event_id, usage_left_before, usage_left_after, scanned_by)
                     VALUES ($1, $2, $3, $4, $5)",
                )
                .bind(ticket_db_id)
                .bind(event_id)
                .bind(before)
                .bind(usage_left)
                .bind(scanned_by)
                .execute(self.pool)
                .await;

                self.write_scan_log(ticket_id_str, event_id, scanned_by, "valid", Some(*usage_left)).await;
                Ok(*usage_left)
            }

            UsageDecision::NotYetValid => {
                self.write_scan_log(ticket_id_str, event_id, scanned_by, "invalid", None).await;
                Ok(-1)
            }

            UsageDecision::Expired => {
                // Mark expired in DB so future scans skip the engine entirely
                let _ = sqlx::query("UPDATE tickets SET status='expired' WHERE id=$1")
                    .bind(ticket_db_id)
                    .execute(self.pool)
                    .await;
                self.write_scan_log(ticket_id_str, event_id, scanned_by, "invalid", None).await;
                Ok(-2)
            }

            UsageDecision::DepletedRenewable => {
                self.write_scan_log(ticket_id_str, event_id, scanned_by, "already_used", None).await;
                Ok(-3)
            }
        }
    }

    async fn write_scan_log(
        &self,
        ticket_id: &str,
        event_id: Uuid,
        scanned_by: Option<Uuid>,
        result: &str,
        usage_left: Option<i32>,
    ) {
        let _ = sqlx::query(
            "INSERT INTO scan_log (ticket_id, event_id, scanned_by, result, usage_left_after)
             SELECT t.id, $2, $3, $4, $5 FROM tickets t WHERE t.ticket_id = $1",
        )
        .bind(ticket_id)
        .bind(event_id)
        .bind(scanned_by)
        .bind(result)
        .bind(usage_left)
        .execute(self.pool)
        .await;
    }
}
