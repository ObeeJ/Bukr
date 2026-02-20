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
        // RULE 1: Quantity validation - because buying 0 or 100 tickets is sus
        if req.quantity < 1 || req.quantity > 10 {
            return Err(AppError::Validation("Quantity must be between 1 and 10".into()));
        }

        // RULE 2: Excitement rating validation (if provided)
        if let Some(rating) = req.excitement_rating {
            if rating < 1 || rating > 10 {
                return Err(AppError::Validation("Excitement rating must be between 1 and 10".into()));
            }
        }

        // RULE 3: Payment provider validation
        if req.payment_provider != "paystack" && req.payment_provider != "stripe" {
            return Err(AppError::Validation("Payment provider must be 'paystack' or 'stripe'".into()));
        }

        // START TRANSACTION - Critical section for race condition prevention
        let mut tx = self.repo.pool().begin().await.map_err(AppError::Database)?;

        // STEP 1: Fetch event details WITH ROW LOCK (SELECT FOR UPDATE)
        // This prevents concurrent purchases from seeing the same availability
        let row = sqlx::query(
            r#"SELECT title, date::text as date, time::text as time, location, price, currency, available_tickets
            FROM events WHERE id = $1 AND status = 'active' FOR UPDATE"#,
        )
        .bind(req.event_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound("Event not found".into()))?;

        // Extract event data - destructuring would be cleaner but explicit is better
        let title: String = row.get("title");
        let date: String = row.get("date");
        let time: String = row.get("time");
        let location: String = row.get("location");
        let unit_price: Decimal = row.get("price");
        let currency: String = row.get("currency");
        let available: i32 = row.get("available_tickets");

        // RULE 2: Availability check - can't sell what we don't have
        if available < req.quantity {
            return Err(AppError::TicketsExhausted);
        }

        // STEP 2: Promo code validation - if they have a coupon, let's check it
        let mut discount = Decimal::ZERO;  // Start with no discount (pessimistic approach)

        let promo_code_id = if let Some(ref code) = req.promo_code {
            // They provided a promo code - time to validate
            // Note: Promo validation uses separate connection, not transaction
            let promo = self.promo_repo.validate(req.event_id, code).await
                .map_err(AppError::Database)?;
            
            if let Some(p) = promo {
                // Valid promo! Apply the discount
                discount = p.discount_percentage;
                Some(p.id)
            } else {
                // Invalid promo - rollback transaction and reject
                tx.rollback().await.map_err(AppError::Database)?;
                return Err(AppError::PromoInvalid("Invalid or expired promo code".into()));
            }
        } else {
            // No promo code provided - full price it is
            None
        };

        // STEP 3: Price calculation - the math that matters
        let quantity_dec = Decimal::from_i32(req.quantity).unwrap_or(Decimal::ONE);
        let discount_multiplier = (Decimal::from(100) - discount) / Decimal::from(100);
        let total_price = unit_price * quantity_dec * discount_multiplier;

        // STEP 4: Generate ticket ID - unique and human-readable
        // Format: BUKR-1234-eventid (first 8 chars)
        let short_id = rand::random::<u16>();
        let ticket_id_str = format!("BUKR-{:04}-{}", short_id, &req.event_id.to_string()[..8]);

        // STEP 5: Generate QR code data - JSON payload for scanning
        let qr_data = serde_json::json!({
            "ticketId": ticket_id_str,
            "eventId": req.event_id.to_string(),
        })
        .to_string();

        // STEP 6: Generate payment reference - unique identifier for payment tracking
        // Format: BUKR-PAY-timestamp-random
        let timestamp = chrono::Utc::now().timestamp();
        let pay_rand: u32 = rand::random();
        let payment_ref = format!("BUKR-PAY-{}-{:06x}", timestamp, pay_rand);

        // Default ticket type if not specified - because everyone deserves admission
        let ticket_type = req.ticket_type.as_deref().unwrap_or("General Admission");

        // STEP 7: Create ticket in database WITHIN TRANSACTION
        let ticket = self.repo.create_with_tx(
            &mut tx,
            req.event_id, user_id, &ticket_id_str, ticket_type, req.quantity,
            unit_price, total_price, discount, promo_code_id, &currency,
            &qr_data, &payment_ref, &req.payment_provider, req.excitement_rating,
        ).await.map_err(|e| {
            // Handle race condition - someone else might have bought the last ticket
            if e.to_string().contains("Not enough tickets") {
                AppError::TicketsExhausted
            } else {
                AppError::Database(e)
            }
        })?;

        // COMMIT TRANSACTION - All or nothing
        tx.commit().await.map_err(AppError::Database)?;

        // STEP 8: Build response DTOs - separate concerns, clean interfaces
        let ticket_resp = TicketResponse {
            id: ticket.id, ticket_id: ticket.ticket_id, event_id: ticket.event_id,
            event_title: title, event_date: date, event_time: time, event_location: location,
            ticket_type: ticket.ticket_type, quantity: ticket.quantity,
            unit_price: ticket.unit_price, discount_applied: ticket.discount_applied,
            total_price: ticket.total_price, currency: ticket.currency.clone(),
            status: ticket.status, qr_code_data: ticket.qr_code_data,
            purchase_date: ticket.purchase_date,
        };

        // STEP 9: Build payment initialization response
        // Note: This is a mock URL - real implementation would call Paystack API
        let payment_resp = PaymentInitResponse {
            provider: req.payment_provider.clone(),
            authorization_url: Some(format!("https://checkout.paystack.com/{}", payment_ref)),
            checkout_url: None,
            reference: payment_ref,
            amount: total_price,
            currency: ticket.currency,
        };

        // Success! Return both ticket and payment info
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
