use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use super::dto::PromoCode;

#[derive(Clone)]
pub struct PromoRepository {
    pool: PgPool,
}

impl PromoRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn list_by_event(&self, event_id: Uuid) -> Result<Vec<PromoCode>, sqlx::Error> {
        let rows = sqlx::query(
            r#"SELECT id, event_id, code, discount_percentage, ticket_limit,
                      used_count, is_active, expires_at, created_at, updated_at
            FROM promo_codes WHERE event_id = $1 ORDER BY created_at DESC"#,
        )
        .bind(event_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(row_to_promo).collect())
    }

    pub async fn create(
        &self,
        event_id: Uuid,
        code: &str,
        discount_percentage: Decimal,
        ticket_limit: i32,
        expires_at: Option<DateTime<Utc>>,
    ) -> Result<PromoCode, sqlx::Error> {
        let row = sqlx::query(
            r#"INSERT INTO promo_codes (event_id, code, discount_percentage, ticket_limit, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, event_id, code, discount_percentage, ticket_limit,
                      used_count, is_active, expires_at, created_at, updated_at"#,
        )
        .bind(event_id)
        .bind(code)
        .bind(discount_percentage)
        .bind(ticket_limit)
        .bind(expires_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(row_to_promo(&row))
    }

    pub async fn delete(&self, promo_id: Uuid, event_id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM promo_codes WHERE id = $1 AND event_id = $2")
            .bind(promo_id)
            .bind(event_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn toggle_active(&self, promo_id: Uuid, event_id: Uuid) -> Result<Option<PromoCode>, sqlx::Error> {
        let row = sqlx::query(
            r#"UPDATE promo_codes SET is_active = NOT is_active
            WHERE id = $1 AND event_id = $2
            RETURNING id, event_id, code, discount_percentage, ticket_limit,
                      used_count, is_active, expires_at, created_at, updated_at"#,
        )
        .bind(promo_id)
        .bind(event_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.as_ref().map(row_to_promo))
    }

    pub async fn validate(&self, event_id: Uuid, code: &str) -> Result<Option<PromoCode>, sqlx::Error> {
        let row = sqlx::query(
            r#"SELECT id, event_id, code, discount_percentage, ticket_limit,
                      used_count, is_active, expires_at, created_at, updated_at
            FROM promo_codes
            WHERE event_id = $1 AND code = $2 AND is_active = true
              AND (expires_at IS NULL OR expires_at > NOW())
              AND (ticket_limit = 0 OR used_count < ticket_limit)"#,
        )
        .bind(event_id)
        .bind(code)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.as_ref().map(row_to_promo))
    }
}

fn row_to_promo(row: &sqlx::postgres::PgRow) -> PromoCode {
    PromoCode {
        id: row.get("id"),
        event_id: row.get("event_id"),
        code: row.get("code"),
        discount_percentage: row.get("discount_percentage"),
        ticket_limit: row.get("ticket_limit"),
        used_count: row.get("used_count"),
        is_active: row.get("is_active"),
        expires_at: row.get("expires_at"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}
