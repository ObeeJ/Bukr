use chrono::Utc;
use rust_decimal::Decimal;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use super::dto::Ticket;

pub struct TicketRepository {
    pool: PgPool,
}

impl TicketRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    pub async fn create(
        &self,
        event_id: Uuid,
        user_id: Uuid,
        ticket_id: &str,
        ticket_type: &str,
        quantity: i32,
        unit_price: Decimal,
        total_price: Decimal,
        discount_applied: Decimal,
        promo_code_id: Option<Uuid>,
        currency: &str,
        qr_code_data: &str,
        payment_ref: &str,
        payment_provider: &str,
        excitement_rating: Option<i32>,
    ) -> Result<Ticket, sqlx::Error> {
        let row = sqlx::query(
            r#"INSERT INTO tickets
                (event_id, user_id, ticket_id, ticket_type, quantity, unit_price, total_price,
                 discount_applied, promo_code_id, currency, qr_code_data, payment_ref,
                 payment_provider, excitement_rating, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'valid')
            RETURNING id, ticket_id, event_id, user_id, ticket_type, quantity,
                      unit_price, total_price, discount_applied, promo_code_id,
                      currency, status, qr_code_data, payment_ref, payment_provider,
                      excitement_rating, scanned_at, purchase_date, created_at"#,
        )
        .bind(event_id)
        .bind(user_id)
        .bind(ticket_id)
        .bind(ticket_type)
        .bind(quantity)
        .bind(unit_price)
        .bind(total_price)
        .bind(discount_applied)
        .bind(promo_code_id)
        .bind(currency)
        .bind(qr_code_data)
        .bind(payment_ref)
        .bind(payment_provider)
        .bind(excitement_rating)
        .fetch_one(&self.pool)
        .await?;

        Ok(row_to_ticket(&row))
    }

    pub async fn get_by_ticket_id(&self, ticket_id: &str) -> Result<Option<Ticket>, sqlx::Error> {
        let row = sqlx::query(
            r#"SELECT id, ticket_id, event_id, user_id, ticket_type, quantity,
                      unit_price, total_price, discount_applied, promo_code_id,
                      currency, status, qr_code_data, payment_ref, payment_provider,
                      excitement_rating, scanned_at, purchase_date, created_at
            FROM tickets WHERE ticket_id = $1"#,
        )
        .bind(ticket_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.as_ref().map(row_to_ticket))
    }

    pub async fn get_user_tickets(&self, user_id: Uuid) -> Result<Vec<Ticket>, sqlx::Error> {
        let rows = sqlx::query(
            r#"SELECT id, ticket_id, event_id, user_id, ticket_type, quantity,
                      unit_price, total_price, discount_applied, promo_code_id,
                      currency, status, qr_code_data, payment_ref, payment_provider,
                      excitement_rating, scanned_at, purchase_date, created_at
            FROM tickets WHERE user_id = $1 ORDER BY purchase_date DESC"#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(row_to_ticket).collect())
    }

    pub async fn get_event_tickets(&self, event_id: Uuid) -> Result<Vec<Ticket>, sqlx::Error> {
        let rows = sqlx::query(
            r#"SELECT id, ticket_id, event_id, user_id, ticket_type, quantity,
                      unit_price, total_price, discount_applied, promo_code_id,
                      currency, status, qr_code_data, payment_ref, payment_provider,
                      excitement_rating, scanned_at, purchase_date, created_at
            FROM tickets WHERE event_id = $1 ORDER BY purchase_date DESC"#,
        )
        .bind(event_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(row_to_ticket).collect())
    }

    pub async fn mark_used(&self, ticket_id: &str, scanned_by: Option<Uuid>) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "UPDATE tickets SET status = 'used', scanned_at = $2, scanned_by = $3 WHERE ticket_id = $1 AND status = 'valid'",
        )
        .bind(ticket_id)
        .bind(Utc::now())
        .bind(scanned_by)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn update_payment_status(&self, payment_ref: &str, status: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "UPDATE tickets SET status = $2 WHERE payment_ref = $1",
        )
        .bind(payment_ref)
        .bind(status)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }
}

fn row_to_ticket(row: &sqlx::postgres::PgRow) -> Ticket {
    Ticket {
        id: row.get("id"),
        ticket_id: row.get("ticket_id"),
        event_id: row.get("event_id"),
        user_id: row.get("user_id"),
        ticket_type: row.get("ticket_type"),
        quantity: row.get("quantity"),
        unit_price: row.get("unit_price"),
        total_price: row.get("total_price"),
        discount_applied: row.get("discount_applied"),
        promo_code_id: row.get("promo_code_id"),
        currency: row.get("currency"),
        status: row.get("status"),
        qr_code_data: row.get("qr_code_data"),
        payment_ref: row.get("payment_ref"),
        payment_provider: row.get("payment_provider"),
        excitement_rating: row.get("excitement_rating"),
        scanned_at: row.get("scanned_at"),
        purchase_date: row.get("purchase_date"),
        created_at: row.get("created_at"),
    }
}
