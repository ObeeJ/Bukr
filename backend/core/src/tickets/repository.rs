/**
 * REPOSITORY LAYER - Data Access
 * 
 * TicketRepository: The gatekeeper to the tickets table
 * 
 * Architecture Layer: Repository (Layer 5)
 * Dependencies: Database (Infrastructure Layer 6)
 * Responsibility: CRUD operations, SQL queries, data mapping
 * 
 * Repository Pattern Rules:
 * 1. Only talks to the database - no business logic
 * 2. Returns domain models (Ticket), not database rows
 * 3. Handles SQL errors, doesn't handle business errors
 * 4. Dumb and proud - just fetch, save, update, delete
 */

use chrono::Utc;
use rust_decimal::Decimal;
use sqlx::{PgPool, Row};
use uuid::Uuid;
// Decimal kept: used in EventData and create_free_with_tx price binds

use super::dto::Ticket;

/**
 * TicketRepository: Your friendly neighborhood database accessor
 * 
 * Holds a connection pool - because opening connections is expensive
 */
pub struct TicketRepository {
    pool: PgPool,  // Connection pool - reuse connections like a responsible developer
}

impl TicketRepository {
    /**
     * Constructor - give me a pool, I'll give you a repository
     */
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /**
     * Expose the pool - sometimes services need direct access
     * (Like when they need to query events table)
     */
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /**
     * Create a new ticket in the database
     * 
     * This is where the INSERT happens - the moment of truth
     * Returns the created ticket with all database-generated fields
     * 
     * Note: The database trigger will auto-decrement available_tickets
     * So we don't need to do it manually - database does the heavy lifting
     * 
     * @returns Created ticket with ID and timestamps
     * @throws sqlx::Error if database says no (constraint violation, etc)
     */
    pub async fn create(
        &self,
        event_id: Uuid,
        user_id: Uuid,
        ticket_id: &str,
        ticket_type: &str,
        quantity: i32,
        usage_limit: i32,
        unit_price: Decimal,
        total_price: Decimal,
        discount_applied: Decimal,
        promo_code_id: Option<Uuid>,
        currency: &str,
        qr_code_data: &str,
        payment_ref: &str,
        payment_provider: &str,
        excitement_rating: Option<i32>,
        valid_from: Option<chrono::DateTime<chrono::Utc>>,
        valid_until: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Result<Ticket, sqlx::Error> {
        let row = sqlx::query(
            r#"INSERT INTO tickets
                (event_id, user_id, ticket_id, ticket_type, quantity, usage_limit, usage_count,
                 unit_price, total_price, discount_applied, promo_code_id, currency,
                 qr_code_data, payment_ref, payment_provider, excitement_rating, status,
                 valid_from, valid_until)
            VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'valid', $16, $17)
            RETURNING id, ticket_id, event_id, user_id, ticket_type, quantity, usage_limit, usage_count,
                      unit_price, total_price, discount_applied, promo_code_id,
                      currency, status, qr_code_data, valid_from, valid_until,
                      payment_ref, payment_provider, excitement_rating, scanned_at,
                      purchase_date, created_at"#,
        )
        .bind(event_id)
        .bind(user_id)
        .bind(ticket_id)
        .bind(ticket_type)
        .bind(quantity)
        .bind(usage_limit)
        .bind(unit_price)
        .bind(total_price)
        .bind(discount_applied)
        .bind(promo_code_id)
        .bind(currency)
        .bind(qr_code_data)
        .bind(payment_ref)
        .bind(payment_provider)
        .bind(excitement_rating)
        .bind(valid_from)
        .bind(valid_until)
        .fetch_one(&self.pool)
        .await?;

        Ok(row_to_ticket(&row))
    }

    pub async fn create_with_tx(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        event_id: Uuid,
        user_id: Uuid,
        ticket_id: &str,
        ticket_type: &str,
        quantity: i32,
        usage_limit: i32,
        usage_model: &str,
        is_renewable: bool,
        unit_price: Decimal,
        total_price: Decimal,
        discount_applied: Decimal,
        promo_code_id: Option<Uuid>,
        currency: &str,
        qr_code_data: &str,
        payment_ref: &str,
        payment_provider: &str,
        excitement_rating: Option<i32>,
        valid_from: Option<chrono::DateTime<chrono::Utc>>,
        valid_until: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Result<Ticket, sqlx::Error> {
        let row = sqlx::query(
            r#"INSERT INTO tickets
                (event_id, user_id, ticket_id, ticket_type, quantity,
                 usage_limit, usage_count, usage_model, usage_total, usage_left, is_renewable,
                 unit_price, total_price, discount_applied, promo_code_id, currency,
                 qr_code_data, payment_ref, payment_provider, excitement_rating, status,
                 valid_from, valid_until)
            VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $6, $6, $8,
                    $9, $10, $11, $12, $13, $14, $15, $16, $17, 'valid', $18, $19)
            RETURNING id, ticket_id, event_id, user_id, ticket_type, quantity,
                      usage_limit, usage_count, unit_price, total_price,
                      discount_applied, promo_code_id, currency, status,
                      qr_code_data, valid_from, valid_until, payment_ref,
                      payment_provider, excitement_rating, scanned_at,
                      purchase_date, created_at"#,
        )
        .bind(event_id)
        .bind(user_id)
        .bind(ticket_id)
        .bind(ticket_type)
        .bind(quantity)
        .bind(usage_limit)
        .bind(usage_model)
        .bind(is_renewable)
        .bind(unit_price)
        .bind(total_price)
        .bind(discount_applied)
        .bind(promo_code_id)
        .bind(currency)
        .bind(qr_code_data)
        .bind(payment_ref)
        .bind(payment_provider)
        .bind(excitement_rating)
        .bind(valid_from)
        .bind(valid_until)
        .fetch_one(&mut **tx)
        .await?;

        Ok(row_to_ticket(&row))
    }

    pub async fn get_by_ticket_id(&self, ticket_id: &str) -> Result<Option<Ticket>, sqlx::Error> {
        let row = sqlx::query(
            r#"SELECT id, ticket_id, event_id, user_id, ticket_type, quantity, usage_limit, usage_count,
                      unit_price, total_price, discount_applied, promo_code_id,
                      currency, status, qr_code_data, valid_from, valid_until,
                      payment_ref, payment_provider, excitement_rating, scanned_at,
                      purchase_date, created_at
            FROM tickets WHERE ticket_id = $1"#,
        )
        .bind(ticket_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.as_ref().map(row_to_ticket))
    }

    pub async fn get_user_tickets(&self, user_id: Uuid) -> Result<Vec<Ticket>, sqlx::Error> {
        let rows = sqlx::query(
            r#"SELECT id, ticket_id, event_id, user_id, ticket_type, quantity, usage_limit, usage_count,
                      unit_price, total_price, discount_applied, promo_code_id,
                      currency, status, qr_code_data, valid_from, valid_until,
                      payment_ref, payment_provider, excitement_rating, scanned_at,
                      purchase_date, created_at
            FROM tickets WHERE user_id = $1 ORDER BY purchase_date DESC"#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(row_to_ticket).collect())
    }

    pub async fn get_event_tickets(&self, event_id: Uuid) -> Result<Vec<Ticket>, sqlx::Error> {
        let rows = sqlx::query(
            r#"SELECT id, ticket_id, event_id, user_id, ticket_type, quantity, usage_limit, usage_count,
                      unit_price, total_price, discount_applied, promo_code_id,
                      currency, status, qr_code_data, valid_from, valid_until,
                      payment_ref, payment_provider, excitement_rating, scanned_at,
                      purchase_date, created_at
            FROM tickets WHERE event_id = $1 ORDER BY purchase_date DESC"#,
        )
        .bind(event_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(row_to_ticket).collect())
    }

    /**
     * Mark a ticket as used (scanned at the door)
     * 
     * Updates status to 'used' and records scan timestamp
     * Only works if ticket is currently 'valid' - can't scan twice
     * 
     * @param ticket_id - Ticket ID to mark
     * @param scanned_by - Optional UUID of who scanned it
     * @returns true if updated, false if ticket not found or already used
     */
    pub async fn mark_used(&self, ticket_id: &str, scanned_by: Option<Uuid>) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "UPDATE tickets SET status = 'used', scanned_at = $2, scanned_by = $3 WHERE ticket_id = $1 AND status = 'valid'",
        )
        .bind(ticket_id)
        .bind(Utc::now())
        .bind(scanned_by)
        .execute(&self.pool)
        .await?;

        // rows_affected() tells us if the UPDATE actually changed anything
        Ok(result.rows_affected() > 0)
    }

    /**
     * Update ticket status based on payment result
     * 
     * Called by payment webhook - when Paystack/Stripe confirms payment
     * Changes status from 'pending' to 'valid' (or 'failed')
     * 
     * @param payment_ref - Payment reference from gateway
     * @param status - New status ('valid' or 'failed')
     * @returns true if updated, false if payment_ref not found
     */
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

/**
 * Helper function: Convert database row to Ticket domain model
 * 
 * Extracts all fields from the row and builds a Ticket struct
 * Centralized mapping - if we change the Ticket struct, we only update this
 * 
 * @param row - PostgreSQL row from query result
 * @returns Ticket domain model
 */
fn row_to_ticket(row: &sqlx::postgres::PgRow) -> Ticket {
    Ticket {
        id: row.get("id"),
        ticket_id: row.get("ticket_id"),
        event_id: row.get("event_id"),
        user_id: row.get("user_id"),
        ticket_type: row.get("ticket_type"),
        quantity: row.get("quantity"),
        usage_limit: row.get("usage_limit"),
        usage_count: row.get("usage_count"),
        unit_price: row.get("unit_price"),
        total_price: row.get("total_price"),
        discount_applied: row.get("discount_applied"),
        promo_code_id: row.get("promo_code_id"),
        currency: row.get("currency"),
        status: row.get("status"),
        qr_code_data: row.get("qr_code_data"),
        valid_from: row.get("valid_from"),
        valid_until: row.get("valid_until"),
        payment_ref: row.get("payment_ref"),
        payment_provider: row.get("payment_provider"),
        excitement_rating: row.get("excitement_rating"),
        scanned_at: row.get("scanned_at"),
        purchase_date: row.get("purchase_date"),
        created_at: row.get("created_at"),
    }
}

impl TicketRepository {
    pub async fn get_event(&self, event_id: Uuid) -> Result<Option<EventData>, sqlx::Error> {
        let row = sqlx::query("SELECT id, price, available_tickets, status, currency FROM events WHERE id = $1")
            .bind(event_id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.map(|r| EventData {
            id: r.get("id"),
            price: r.get("price"),
            available_tickets: r.get("available_tickets"),
            status: r.get("status"),
            currency: r.get("currency"),
        }))
    }

    /// Same as get_event but acquires a row-level lock inside an open transaction.
    /// Used by claim_free to prevent the race condition where two concurrent
    /// requests both pass the availability check before either inserts.
    pub async fn get_event_for_update(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        event_id: Uuid,
    ) -> Result<Option<EventData>, sqlx::Error> {
        let row = sqlx::query(
            "SELECT id, price, available_tickets, status, currency FROM events WHERE id = $1 FOR UPDATE"
        )
        .bind(event_id)
        .fetch_optional(&mut **tx)
        .await?;
        Ok(row.map(|r| EventData {
            id: r.get("id"),
            price: r.get("price"),
            available_tickets: r.get("available_tickets"),
            status: r.get("status"),
            currency: r.get("currency"),
        }))
    }

    pub async fn check_user_ticket(&self, user_id: Uuid, event_id: Uuid) -> Result<bool, sqlx::Error> {
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM tickets WHERE user_id = $1 AND event_id = $2 AND status != 'cancelled'"
        )
        .bind(user_id)
        .bind(event_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(count > 0)
    }

    /// Duplicate check inside an open transaction — consistent read under the FOR UPDATE lock.
    pub async fn check_user_ticket_tx(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        user_id: Uuid,
        event_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM tickets WHERE user_id = $1 AND event_id = $2 AND status != 'cancelled'"
        )
        .bind(user_id)
        .bind(event_id)
        .fetch_one(&mut **tx)
        .await?;
        Ok(count > 0)
    }

    /// Insert a free ticket inside an open transaction.
    /// The DB trigger decrements available_tickets atomically on INSERT.
    pub async fn create_free_with_tx(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        user_id: Uuid,
        event_id: Uuid,
        currency: &str,
    ) -> Result<Ticket, sqlx::Error> {
        let ticket_id = format!(
            "BUKR-{}",
            Uuid::new_v4().to_string().split('-').next().unwrap().to_uppercase()
        );
        let qr_data = format!(
            "{{\"ticket_id\":\"{}\",\"event_id\":\"{}\"}}",
            ticket_id, event_id
        );
        let payment_ref = format!("FREE-{}", Uuid::new_v4());

        let row = sqlx::query(
            r#"INSERT INTO tickets
                (event_id, user_id, ticket_id, ticket_type, quantity, usage_limit, usage_count,
                 unit_price, total_price, discount_applied, currency,
                 qr_code_data, payment_ref, payment_provider, status)
            VALUES ($1, $2, $3, 'general', 1, 1, 0,
                    0, 0, 0, $6,
                    $4, $5, 'free', 'valid')
            RETURNING id, ticket_id, event_id, user_id, ticket_type, quantity, usage_limit, usage_count,
                      unit_price, total_price, discount_applied, promo_code_id,
                      currency, status, qr_code_data, valid_from, valid_until,
                      payment_ref, payment_provider, excitement_rating, scanned_at,
                      purchase_date, created_at"#,
        )
        .bind(event_id)
        .bind(user_id)
        .bind(&ticket_id)
        .bind(&qr_data)
        .bind(&payment_ref)
        .bind(currency)
        .fetch_one(&mut **tx)
        .await?;

        Ok(row_to_ticket(&row))
    }
}

pub struct EventData {
    pub id: Uuid,
    pub price: Decimal,
    pub available_tickets: i32,
    pub status: String,
    pub currency: String,
}
