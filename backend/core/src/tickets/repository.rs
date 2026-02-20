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
        // INSERT and RETURNING in one query - PostgreSQL magic
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

        // Convert database row to domain model
        Ok(row_to_ticket(&row))
    }

    /**
     * Create ticket within an existing transaction
     * 
     * Used for atomic operations with row locking
     * Prevents race conditions in ticket purchase
     * 
     * @param tx - Mutable reference to active transaction
     * @returns Created ticket
     */
    pub async fn create_with_tx(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
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
        .fetch_one(&mut **tx)
        .await?;

        Ok(row_to_ticket(&row))
    }

    /**
     * Find a ticket by its human-readable ID
     * 
     * Used for scanning - scanner reads QR code, we look up the ticket
     * 
     * @param ticket_id - The BUKR-XXXX-XXXX identifier
     * @returns Some(Ticket) if found, None if not found
     */
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

        // Convert Option<Row> to Option<Ticket>
        Ok(row.as_ref().map(row_to_ticket))
    }

    /**
     * Get all tickets for a specific user
     * 
     * Used for "My Tickets" page - show me what I bought
     * Ordered by purchase date DESC - newest first
     * 
     * @param user_id - User's UUID
     * @returns Vector of tickets (empty if user has no tickets)
     */
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

        // Map each row to a Ticket - functional programming FTW
        Ok(rows.iter().map(row_to_ticket).collect())
    }

    /**
     * Get all tickets for a specific event
     * 
     * Organizer view - see who bought tickets to my event
     * Ordered by purchase date DESC - newest first
     * 
     * @param event_id - Event's UUID
     * @returns Vector of tickets (empty if no tickets sold)
     */
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

impl TicketRepository {
    pub async fn get_event(&self, event_id: Uuid) -> Result<Option<EventData>, sqlx::Error> {
        let row = sqlx::query("SELECT id, price, available_tickets, status FROM events WHERE id = $1")
            .bind(event_id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.map(|r| EventData {
            id: r.get("id"),
            price: r.get("price"),
            available_tickets: r.get("available_tickets"),
            status: r.get("status"),
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

    pub async fn create_ticket(&self, user_id: Uuid, event_id: Uuid, price: Decimal, promo_code_id: Option<Uuid>) -> Result<Ticket, sqlx::Error> {
        let ticket_id = format!("BUKR-{}", Uuid::new_v4().to_string().split('-').next().unwrap().to_uppercase());
        let qr_data = format!("{{\"ticket_id\":\"{}\",\"event_id\":\"{}\"}}", ticket_id, event_id);
        self.create(event_id, user_id, &ticket_id, "general", 1, price, price, Decimal::ZERO, promo_code_id, "NGN", &qr_data, &format!("FREE-{}", Uuid::new_v4()), "free", None).await
    }
}

pub struct EventData {
    pub id: Uuid,
    pub price: Decimal,
    pub available_tickets: i32,
    pub status: String,
}
