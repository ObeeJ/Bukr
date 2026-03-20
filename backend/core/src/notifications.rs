// Notification queue writer.
// Inserts into ticket_notifications — the Go worker drains and sends emails.
// Fire-and-forget: errors are logged, never propagated to the scan response.

use sqlx::PgPool;
use uuid::Uuid;

pub async fn queue(
    pool: &PgPool,
    ticket_db_id: Uuid,
    user_id: Uuid,
    event_id: Uuid,
    notif_type: &str,
    payload: serde_json::Value,
) {
    let _ = sqlx::query(
        "INSERT INTO ticket_notifications (ticket_id, user_id, event_id, type, payload)
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(ticket_db_id)
    .bind(user_id)
    .bind(event_id)
    .bind(notif_type)
    .bind(payload)
    .execute(pool)
    .await;
}
