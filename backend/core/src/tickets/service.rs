/**
 * USE CASE LAYER - Business Logic
 * 
 * TicketService: The brain of ticket operations - where business rules live
 * 
 * Architecture Layer: Use Case / Application Service (Layer 3)
 * Dependencies: TicketRepository (Layer 5), PromoRepository (Layer 5)
 * Responsibility: Orchestrate business logic, validate rules, coordinate repositories
 * 
 * This is where the magic happens - controllers are dumb, repositories are dumb,
 * but services? Services are where we get smart.
 */

use rust_decimal::Decimal;
use rust_decimal::prelude::FromPrimitive;
use sqlx::Row;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::fees::{compute_fees, validate_min_price, FeeMode};
use crate::promos::repository::PromoRepository;
use super::dto::{PurchaseTicketRequest, TicketResponse, PaymentInitResponse, PurchaseResponse};
use super::repository::TicketRepository;

/**
 * TicketService: The conductor of the ticket purchase orchestra
 * 
 * Holds references to repositories - because services coordinate, they don't do the dirty work
 */
pub struct TicketService {
    repo: TicketRepository,           // Where tickets live
    promo_repo: PromoRepository,      // Where promo codes hide
}

impl TicketService {
    /**
     * Constructor - because even services need to be born
     * 
     * @param repo - Ticket repository for data access
     * @param promo_repo - Promo repository for discount validation
     */
    pub fn new(repo: TicketRepository, promo_repo: PromoRepository) -> Self {
        Self { repo, promo_repo }
    }

    /**
     * Purchase tickets - the main event (pun intended)
     * 
     * Business Rules Enforced:
     * 1. Quantity must be 1-10 (no bulk buying, no zero buying)
     * 2. Event must exist and be active (can't buy tickets to imaginary events)
     * 3. Tickets must be available (first come, first served)
     * 4. Promo codes must be valid if provided (no fake discounts)
     * 5. Price calculation must be accurate (math matters)
     * 
     * Flow:
     * 1. Validate quantity
     * 2. Fetch event details
     * 3. Check availability
     * 4. Validate promo code (if provided)
     * 5. Calculate final price
     * 6. Generate ticket ID and QR code
     * 7. Create ticket in database
     * 8. Generate payment reference
     * 9. Return ticket + payment info
     * 
     * @param user_id - Who's buying?
     * @param req - Purchase request with event_id, quantity, promo, etc
     * @returns Ticket and payment initialization data
     */
    pub async fn purchase(
        &self,
        user_id: Uuid,
        req: PurchaseTicketRequest,
    ) -> Result<PurchaseResponse> {
        // Input validation — cheap, no DB needed
        if req.quantity < 1 || req.quantity > 10 {
            return Err(AppError::Validation("Quantity must be between 1 and 10".into()));
        }
        if let Some(rating) = req.excitement_rating {
            if rating < 1 || rating > 10 {
                return Err(AppError::Validation("Excitement rating must be between 1 and 10".into()));
            }
        }
        if req.payment_provider != "paystack" {
            return Err(AppError::Validation("Only 'paystack' is supported".into()));
        }

        // ── STEP 1: Validate promo code BEFORE acquiring the row lock ────────────────────
        // Promo validation is a read-only query with no side effects.
        // Doing it outside the transaction means the row lock on `events` is held
        // for the minimum possible time — critical during high-concurrency sales.
        let (promo_code_id, discount) = if let Some(ref code) = req.promo_code {
            let promo = self.promo_repo.validate(req.event_id, code).await
                .map_err(AppError::Database)?;
            match promo {
                Some(p) => (Some(p.id), p.discount_percentage),
                None => return Err(AppError::PromoInvalid("Invalid or expired promo code".into())),
            }
        } else {
            (None, Decimal::ZERO)
        };

        // ── STEP 2: Open transaction and acquire row lock ─────────────────────────────
        // The lock is now held only for: availability check + ticket insert + commit.
        // Everything else (promo, fee calc, ID generation) is already done.
        let mut tx = self.repo.pool().begin().await.map_err(AppError::Database)?;

        let row = sqlx::query(
            r#"SELECT title, date::text as date, time::text as time, location, price, currency,
                      available_tickets, organizer_id
            FROM events WHERE id = $1 AND status = 'active' FOR UPDATE"#,
        )
        .bind(req.event_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound("Event not found".into()))?;

        let title: String = row.get("title");
        let date: String = row.get("date");
        let time: String = row.get("time");
        let location: String = row.get("location");
        let unit_price: Decimal = row.get("price");
        let currency: String = row.get("currency");
        let available: i32 = row.get("available_tickets");
        let organizer_id: Uuid = row.get("organizer_id");

        if available < req.quantity {
            return Err(AppError::TicketsExhausted);
        }

        // ── STEP 3: Fee calculation (pure math, no I/O, lock still held) ─────────────
        validate_min_price(unit_price).map_err(AppError::Validation)?;
        let discount_multiplier = (Decimal::from(100) - discount) / Decimal::from(100);
        let desired_payout = unit_price * discount_multiplier;
        let fee_mode = FeeMode::default();
        let fees = compute_fees(desired_payout, req.quantity, &fee_mode);
        let total_price    = fees.buyer_total;
        let platform_fee   = fees.platform_fee;
        let bukrshield_fee = fees.bukrshield_fee;
        let organizer_payout = fees.organizer_payout;

        // ── STEP 4: Generate IDs (no I/O) ─────────────────────────────────────────
        let short_id = rand::random::<u16>();
        let ticket_id_str = format!("BUKR-{:04}-{}", short_id, &req.event_id.to_string()[..8]);
        let qr_data = serde_json::json!({
            "ticketId": ticket_id_str,
            "eventId": req.event_id.to_string(),
        }).to_string();
        let timestamp = chrono::Utc::now().timestamp();
        let pay_rand: u32 = rand::random();
        let payment_ref = format!("BUKR-PAY-{}-{:06x}", timestamp, pay_rand);
        let ticket_type = req.ticket_type.as_deref().unwrap_or("General Admission");

        // ── STEP 5: Insert ticket within transaction, then COMMIT ──────────────────
        let ticket = self.repo.create_with_tx(
            &mut tx,
            req.event_id, user_id, &ticket_id_str, ticket_type, req.quantity,
            unit_price, total_price, discount, promo_code_id, &currency,
            &qr_data, &payment_ref, &req.payment_provider, req.excitement_rating,
        ).await.map_err(|e| {
            if e.to_string().contains("Not enough tickets") {
                AppError::TicketsExhausted
            } else {
                AppError::Database(e)
            }
        })?;

        // COMMIT — row lock released here. All subsequent work is non-blocking.
        tx.commit().await.map_err(AppError::Database)?;

        // ── STEP 6: Revenue ledger — fire-and-forget after lock release ───────────
        let pool = self.repo.pool();
        let ticket_db_id = ticket.id;

        if platform_fee > Decimal::ZERO {
            let _ = sqlx::query(
                r#"INSERT INTO platform_revenue
                   (source, reference_id, organizer_id, amount, currency, meta)
                   VALUES ('ticket_fee', $1, $2, $3, $4, $5)"#,
            )
            .bind(ticket_db_id)
            .bind(organizer_id)
            .bind(platform_fee)
            .bind(&currency)
            .bind(serde_json::json!({ "quantity": req.quantity, "unit_price": unit_price }))
            .execute(pool)
            .await;
        }

        if bukrshield_fee > Decimal::ZERO {
            let _ = sqlx::query(
                r#"INSERT INTO platform_revenue
                   (source, reference_id, organizer_id, amount, currency, meta)
                   VALUES ('bukrshield_fee', $1, $2, $3, $4, $5)"#,
            )
            .bind(ticket_db_id)
            .bind(organizer_id)
            .bind(bukrshield_fee)
            .bind(&currency)
            .bind(serde_json::json!({ "quantity": req.quantity }))
            .execute(pool)
            .await;
        }

        let ticket_resp = TicketResponse {
            id: ticket.id, ticket_id: ticket.ticket_id, event_id: ticket.event_id,
            event_title: title, event_date: date, event_time: time, event_location: location,
            ticket_type: ticket.ticket_type, quantity: ticket.quantity,
            unit_price: ticket.unit_price, discount_applied: ticket.discount_applied,
            total_price: ticket.total_price, currency: ticket.currency.clone(),
            status: ticket.status, qr_code_data: ticket.qr_code_data,
            purchase_date: ticket.purchase_date,
        };

        let payment_resp = PaymentInitResponse {
            provider: req.payment_provider.clone(),
            authorization_url: Some(format!("https://checkout.paystack.com/{}", payment_ref)),
            checkout_url: None,
            reference: payment_ref,
            amount: total_price,
            currency: ticket.currency,
            platform_fee,
            bukrshield_fee,
            organizer_payout,
        };

        Ok(PurchaseResponse { ticket: ticket_resp, payment: payment_resp })
    }

    /**
     * Get all tickets for a specific user
     * 
     * Simple delegation to repository - no business logic needed here
     * 
     * @param user_id - User's UUID
     * @returns List of tickets owned by this user
     */
    pub async fn get_user_tickets(&self, user_id: Uuid) -> Result<Vec<super::dto::Ticket>> {
        self.repo.get_user_tickets(user_id).await.map_err(AppError::Database)
    }

    /**
     * Get all tickets for a specific event
     * 
     * Organizer view - see who bought tickets
     * 
     * @param event_id - Event's UUID
     * @returns List of all tickets for this event
     */
    pub async fn get_event_tickets(&self, event_id: Uuid) -> Result<Vec<super::dto::Ticket>> {
        self.repo.get_event_tickets(event_id).await.map_err(AppError::Database)
    }

    /**
     * Mark a ticket as used (scanned at the door)
     * 
     * @param ticket_id - Ticket ID string (BUKR-XXXX-XXXX)
     * @param scanned_by - Optional UUID of who scanned it
     * @returns true if marked successfully
     */
    pub async fn mark_used(&self, ticket_id: &str, scanned_by: Option<Uuid>) -> Result<bool> {
        self.repo.mark_used(ticket_id, scanned_by).await.map_err(AppError::Database)
    }

    /**
     * Claim free ticket for zero-price event
     * 
     * Business Rules:
     * 1. Event must exist and be active
     * 2. Event price must be 0
     * 3. Tickets must be available
     * 4. User can only claim once per event
     * 
     * @param user_id - User claiming the ticket
     * @param event_id - Event to claim ticket for
     * @returns Created ticket
     */
    pub async fn claim_free(&self, user_id: Uuid, event_id: Uuid) -> Result<super::dto::Ticket> {
        // Verify event exists and is free
        let event = self.repo.get_event(event_id).await
            .map_err(AppError::Database)?
            .ok_or_else(|| AppError::NotFound("Event not found".into()))?;

        if event.price > Decimal::ZERO {
            return Err(AppError::BadRequest("Event is not free".into()));
        }

        if event.available_tickets <= 0 {
            return Err(AppError::BadRequest("No tickets available".into()));
        }

        // Check if user already claimed
        let existing = self.repo.check_user_ticket(user_id, event_id).await
            .map_err(AppError::Database)?;
        if existing {
            return Err(AppError::BadRequest("Already claimed ticket for this event".into()));
        }

        // Create free ticket
        self.repo.create_ticket(user_id, event_id, Decimal::ZERO, None).await
            .map_err(AppError::Database)
    }
}
