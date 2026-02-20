/**
 * REPOSITORY LAYER - Promo Code Database Operations
 * 
 * Promo Repository: The promo code vault - storing and retrieving discount codes
 * 
 * Architecture Layer: Repository (Layer 5)
 * Dependencies: Database (PostgreSQL via sqlx)
 * Responsibility: CRUD operations for promo codes
 * 
 * Database Table: promo_codes
 * Columns:
 * - id: UUID primary key
 * - event_id: Foreign key to events
 * - code: Promo code string (unique per event)
 * - discount_percentage: Decimal discount
 * - ticket_limit: Max uses (0 = unlimited)
 * - used_count: Current usage count
 * - is_active: Enable/disable flag
 * - expires_at: Optional expiration
 * - created_at, updated_at: Timestamps
 */

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use super::dto::PromoCode;

/**
 * PromoRepository: Database access for promo codes
 * 
 * Operations:
 * - List promo codes by event
 * - Create new promo code
 * - Delete promo code
 * - Toggle active status
 * - Validate promo code
 */
#[derive(Clone)]
pub struct PromoRepository {
    pool: PgPool,    // Database connection pool
}

impl PromoRepository {
    /**
     * Constructor: Initialize repository with database pool
     */
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /**
     * List Promo Codes by Event
     * 
     * Fetch all promo codes for an event
     * Ordered by creation date (newest first)
     * 
     * @param event_id - Event ID
     * @returns List of promo codes
     */
    pub async fn list_by_event(&self, event_id: Uuid) -> Result<Vec<PromoCode>, sqlx::Error> {
        let rows = sqlx::query(
            r#"SELECT id, event_id, code, discount_percentage, ticket_limit,
                      used_count, is_active, expires_at, created_at, updated_at
            FROM promo_codes WHERE event_id = $1 ORDER BY created_at DESC"#,
        )
        .bind(event_id)
        .fetch_all(&self.pool)
        .await?;

        // Map database rows to PromoCode structs
        Ok(rows.iter().map(row_to_promo).collect())
    }

    /**
     * Create Promo Code
     * 
     * Insert new promo code into database
     * Unique constraint on (event_id, code)
     * 
     * @param event_id - Event ID
     * @param code - Promo code string
     * @param discount_percentage - Discount percentage
     * @param ticket_limit - Max uses (0 = unlimited)
     * @param expires_at - Optional expiration date
     * @returns Created promo code
     */
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

    /**
     * Delete Promo Code
     * 
     * Remove promo code from database
     * Requires both promo_id and event_id (authorization)
     * 
     * @param promo_id - Promo code ID
     * @param event_id - Event ID
     * @returns true if deleted, false if not found
     */
    pub async fn delete(&self, promo_id: Uuid, event_id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM promo_codes WHERE id = $1 AND event_id = $2")
            .bind(promo_id)
            .bind(event_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /**
     * Toggle Promo Active Status
     * 
     * Flip is_active flag (true -> false, false -> true)
     * Useful for pausing codes without deleting
     * 
     * @param promo_id - Promo code ID
     * @param event_id - Event ID
     * @returns Updated promo code or None if not found
     */
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

    /**
     * Validate Promo Code
     * 
     * Check if promo code is valid for use
     * 
     * Validation Checks (in SQL):
     * 1. Code exists for event
     * 2. is_active = true
     * 3. Not expired (expires_at IS NULL OR expires_at > NOW())
     * 4. Usage limit not reached (ticket_limit = 0 OR used_count < ticket_limit)
     * 
     * @param event_id - Event ID
     * @param code - Promo code string
     * @returns Promo code if valid, None if invalid
     */
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

/**
 * Helper: Map Database Row to PromoCode
 * 
 * Converts sqlx Row to PromoCode struct
 * Extracts all columns by name
 * 
 * @param row - Database row
 * @returns PromoCode struct
 */
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
