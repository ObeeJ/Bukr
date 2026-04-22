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
    repo: TicketRepository,
    promo_repo: PromoRepository,
    // qr_secret injected from Config — never read from env directly.
    // Keeps the startup validation in config.rs as the single enforcement point.
    qr_secret: String,
}

impl TicketService {
    pub fn new(repo: TicketRepository, promo_repo: PromoRepository, qr_secret: String) -> Self {
        Self { repo, promo_repo, qr_secret }
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
            if rating < 1 || rating > 5 {
                return Err(AppError::Validation("Excitement rating must be between 1 and 5".into()));
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
        let mut tx = self.repo.pool().begin().await.map_err(AppError::Database)?;

        // If idempotency_key is provided, check if we already processed this request
        if let Some(ref key) = req.idempotency_key {
            if let Some(existing) = self.repo.get_by_idempotency_key(&mut tx, user_id, req.event_id, key).await.map_err(AppError::Database)? {
                // Return existing ticket data immediately to avoid double charge
                let title: String = sqlx::query_scalar("SELECT title FROM events WHERE id = $1").bind(req.event_id).fetch_one(&mut *tx).await.unwrap_or_default();
                // ... (reconstruct response DTOs)
                // Note: simplified for brevity, in production we ensure consistent response format
                return Ok(self.build_purchase_response(existing, title, req.payment_provider, req.quantity).await?);
            }
        }

        let row = sqlx::query(
            r#"SELECT title, date::text as date, time::text as time, location, price, currency,
                      available_tickets, organizer_id, is_multi_use, max_usage,
                      is_time_bound, duration_minutes
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

        let is_multi_use: bool = row.get("is_multi_use");
        let max_usage: i32 = row.get("max_usage");
        let is_time_bound: bool = row.get("is_time_bound");
        let duration_minutes: Option<i32> = row.get("duration_minutes");

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

        // Resolve usage_model: request overrides event defaults
        let usage_model = req.usage_model.as_deref().unwrap_or_else(|| {
            if is_multi_use { "multi" } else { "single" }
        }).to_string();

        // usage_limit: request value > event max_usage > 1
        let usage_limit = req.usage_total
            .unwrap_or_else(|| if is_multi_use { max_usage * req.quantity } else { req.quantity });

        let is_renewable = req.is_renewable.unwrap_or(false);

        // Time-bound: request window overrides event duration
        let now = chrono::Utc::now();
        let valid_from = req.valid_from
            .as_deref()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .or(Some(now));

        let valid_until = req.valid_until
            .as_deref()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .or_else(|| {
                if is_time_bound {
                    duration_minutes.map(|m| now + chrono::Duration::minutes(m as i64))
                } else {
                    None
                }
            });

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
            usage_limit, &usage_model, is_renewable, unit_price, total_price,
            discount, promo_code_id, &currency,
            &qr_data, &payment_ref, &req.payment_provider, req.excitement_rating,
            valid_from, valid_until, req.idempotency_key.as_deref()
        ).await.map_err(|e| {
            if e.to_string().contains("Not enough tickets") {
                AppError::TicketsExhausted
            } else {
                AppError::Database(e)
            }
        })?;

        // COMMIT — row lock released here. All subsequent work is non-blocking.
        tx.commit().await.map_err(AppError::Database)?;

        // ── STEP 6: Mark invite redeemed — fire-and-forget after lock release ─────
        // If this event is invite_only, mark the guest's invite as redeemed.
        // Uses the user_id + event_id to find the invite — no token needed here
        // because the Go gateway already verified identity before forwarding.
        // Failure is silent: the ticket is already issued, invite cleanup is best-effort.
        let pool_ref = self.repo.pool().clone();
        let uid = user_id;
        let eid = req.event_id;
        tokio::spawn(async move {
            let _ = sqlx::query(
                r#"UPDATE event_invites
                   SET status = 'redeemed', redeemed_by = $1, redeemed_at = NOW()
                   WHERE event_id = $2
                     AND redeemed_by IS NULL
                     AND status IN ('pending', 'sent')
                     AND email = (
                         SELECT email FROM users WHERE id = $1
                     )"#,
            )
            .bind(uid)
            .bind(eid)
            .execute(&pool_ref)
            .await;
        });

        // ── STEP 7: Revenue ledger — fire-and-forget after lock release ───────────
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
            usage_limit: ticket.usage_limit, usage_count: ticket.usage_count,
            unit_price: ticket.unit_price, discount_applied: ticket.discount_applied,
            total_price: ticket.total_price, currency: ticket.currency.clone(),
            status: ticket.status, qr_code_data: ticket.qr_code_data,
            valid_from: ticket.valid_from, valid_until: ticket.valid_until,
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

    // Verify the caller owns the event. Returns Forbidden if not.
    // Used by handlers that need ownership checks beyond what the gateway provides.
    pub async fn verify_event_owner(&self, user_id: Uuid, event_id: Uuid) -> Result<()> {
        let row = sqlx::query("SELECT organizer_id FROM events WHERE id = $1")
            .bind(event_id)
            .fetch_optional(self.repo.pool())
            .await
            .map_err(AppError::Database)?
            .ok_or_else(|| AppError::NotFound("Event not found".into()))?;
        let organizer_id: Uuid = row.get("organizer_id");
        if organizer_id != user_id {
            return Err(AppError::Forbidden);
        }
        Ok(())
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
        // Open transaction and lock the event row — same pattern as purchase().
        // Without FOR UPDATE, two concurrent claims both pass the availability
        // check before either inserts, producing duplicate free tickets.
        let mut tx = self.repo.pool().begin().await.map_err(AppError::Database)?;

        let event = self.repo.get_event_for_update(&mut tx, event_id).await
            .map_err(AppError::Database)?
            .ok_or_else(|| AppError::NotFound("Event not found".into()))?;

        if event.status != "active" {
            return Err(AppError::BadRequest("Event is not active".into()));
        }
        if event.price > Decimal::ZERO {
            return Err(AppError::BadRequest("Event is not free".into()));
        }
        if event.available_tickets <= 0 {
            return Err(AppError::BadRequest("No tickets available".into()));
        }

        // Duplicate check inside the same transaction — consistent read under lock.
        let existing = self.repo.check_user_ticket_tx(&mut tx, user_id, event_id).await
            .map_err(AppError::Database)?;
        if existing {
            return Err(AppError::BadRequest("Already claimed ticket for this event".into()));
        }

        let ticket = self.repo.create_free_with_tx(&mut tx, user_id, event_id, &event.currency).await
            .map_err(AppError::Database)?;

        tx.commit().await.map_err(AppError::Database)?;
        Ok(ticket)
    }

    /**
     * Get dynamic QR payload for a ticket
     * 
     * Generates a 3-second rotating TOTP-style QR payload
     * Used by the frontend to refresh the QR code every 3s
     * 
     * @param ticket_id - Human-readable ticket ID
     * @returns Signed QR JSON payload
     */
    pub async fn get_dynamic_qr(&self, ticket_id: &str, user_id: Uuid) -> Result<String> {
        // Ownership check: user_id must match the ticket owner.
        // Without this, any authenticated user can fetch any ticket's QR by guessing the ID.
        let row = sqlx::query(
            r#"SELECT e.event_key 
               FROM tickets t 
               JOIN events e ON t.event_id = e.id 
               WHERE t.ticket_id = $1 AND t.user_id = $2"#
        )
        .bind(ticket_id)
        .bind(user_id)
        .fetch_optional(self.repo.pool())
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound("Ticket not found".into()))?;

        let event_key: String = row.get("event_key");

        // Use the injected secret — same key ScannerService uses to verify.
        let qr_secret = &self.qr_secret;

        let now = chrono::Utc::now().timestamp();
        let window = now / 3;

        // Calculate time-based nonce (TOTP style)
        use hmac::{Hmac, Mac};
        use sha2::Sha256;
        let mut mac = Hmac::<Sha256>::new_from_slice(qr_secret.as_bytes())
            .expect("HMAC accepts any key size");
        mac.update(format!("{}:{}", ticket_id, window).as_bytes());
        let nonce = hex::encode(mac.finalize().into_bytes());

        // Sign the nonce
        let mut mac_sig = Hmac::<Sha256>::new_from_slice(qr_secret.as_bytes())
            .expect("HMAC accepts any key size");
        mac_sig.update(format!("{}:{}", ticket_id, nonce).as_bytes());
        let sig = hex::encode(mac_sig.finalize().into_bytes());

        Ok(serde_json::json!({
            "ticketId": ticket_id,
            "eventKey": event_key,
            "nonce": nonce,
            "sig": sig,
            "ts": now
        }).to_string())
    }

    async fn build_purchase_response(&self, ticket: super::dto::Ticket, title: String, provider: String, _qty: i32) -> Result<PurchaseResponse> {
        let ticket_resp = TicketResponse {
            id: ticket.id, ticket_id: ticket.ticket_id, event_id: ticket.event_id,
            event_title: title, event_date: "N/A".into(), event_time: "N/A".into(), event_location: "N/A".into(),
            ticket_type: ticket.ticket_type, quantity: ticket.quantity,
            usage_limit: ticket.usage_limit, usage_count: ticket.usage_count,
            unit_price: ticket.unit_price, discount_applied: ticket.discount_applied,
            total_price: ticket.total_price, currency: ticket.currency.clone(),
            status: ticket.status, qr_code_data: ticket.qr_code_data,
            valid_from: ticket.valid_from, valid_until: ticket.valid_until,
            purchase_date: ticket.purchase_date,
        };

        let payment_resp = PaymentInitResponse {
            provider,
            authorization_url: None,
            checkout_url: None,
            reference: ticket.payment_ref.unwrap_or_default(),
            amount: ticket.total_price,
            currency: ticket.currency,
            platform_fee: Decimal::ZERO,
            bukrshield_fee: Decimal::ZERO,
            organizer_payout: Decimal::ZERO,
        };

        Ok(PurchaseResponse { ticket: ticket_resp, payment: payment_resp })
    }
}
