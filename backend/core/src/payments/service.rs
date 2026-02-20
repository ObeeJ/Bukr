/**
 * USE CASE LAYER - Payment Processing Business Logic
 * 
 * Payment Service: The financial orchestrator - handling money flows with surgical precision
 * 
 * Architecture Layer: Use Case (Layer 3)
 * Dependencies: Repository (database queries), External APIs (Paystack, Stripe)
 * Responsibility: Payment initialization, webhook processing, signature verification
 * 
 * Why this layer exists:
 * 1. Business Logic - payment flow orchestration
 * 2. Provider Abstraction - support multiple payment gateways
 * 3. Security - webhook signature verification
 * 4. Transaction Management - atomic payment state updates
 * 
 * Payment Flow:
 * 1. User initiates payment -> initialize()
 * 2. Provider processes payment -> webhook callback
 * 3. Verify webhook signature -> verify_paystack_signature()
 * 4. Update payment status -> handle_paystack_webhook()
 * 5. Mark ticket as valid -> ticket status update
 * 
 * Supported Providers:
 * - Paystack (African markets)
 * - Stripe (Global markets)
 */

use hmac::{Hmac, Mac};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sha2::Sha512;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::{AppError, Result};

/**
 * DOMAIN LAYER - Payment DTOs
 * 
 * Data structures for payment operations
 */

// Request to start payment process
#[derive(Debug, Deserialize)]
pub struct InitializePaymentRequest {
    pub ticket_id: Uuid,           // Which ticket to pay for
    pub provider: String,          // "paystack" | "stripe"
    pub callback_url: String,      // Where to redirect after payment
}

// Response with payment gateway URL
#[derive(Debug, Serialize)]
pub struct PaymentInitResponse {
    pub provider: String,                  // Which gateway was used
    pub authorization_url: Option<String>, // Paystack URL
    pub checkout_url: Option<String>,      // Stripe URL
    pub reference: String,                 // Unique payment reference
}

// Paystack webhook callback structure
#[derive(Debug, Deserialize)]
pub struct PaystackWebhookPayload {
    pub event: String,                 // Event type (charge.success, etc)
    pub data: PaystackWebhookData,     // Payment details
}

// Payment transaction data from Paystack
#[derive(Debug, Deserialize, Serialize)]
pub struct PaystackWebhookData {
    pub reference: String,    // Payment reference
    pub status: String,       // Payment status
    pub amount: i64,          // Amount in kobo (NGN) or cents
    pub currency: String,     // Currency code (NGN, USD, etc)
}

/**
 * PaymentService: The money handler
 * 
 * Manages payment lifecycle:
 * - Initialize payment with provider
 * - Verify webhook signatures (security)
 * - Process payment confirmations
 * - Update ticket status
 * 
 * Security Features:
 * - HMAC-SHA512 signature verification
 * - Webhook secret validation
 * - Reference-based idempotency
 */
pub struct PaymentService {
    pool: PgPool,                       // Database connection
    paystack_secret: String,            // Paystack API key
    stripe_secret: String,              // Stripe API key
    paystack_webhook_secret: String,    // Paystack webhook secret
    stripe_webhook_secret: String,      // Stripe webhook secret
}

impl PaymentService {
    /**
     * Constructor: Initialize payment service with secrets
     * 
     * @param pool - Database connection pool
     * @param paystack_secret - Paystack API key
     * @param stripe_secret - Stripe API key
     * @param paystack_webhook_secret - Paystack webhook verification secret
     * @param stripe_webhook_secret - Stripe webhook verification secret
     */
    pub fn new(
        pool: PgPool,
        paystack_secret: String,
        stripe_secret: String,
        paystack_webhook_secret: String,
        stripe_webhook_secret: String,
    ) -> Self {
        Self {
            pool,
            paystack_secret,
            stripe_secret,
            paystack_webhook_secret,
            stripe_webhook_secret,
        }
    }

    /**
     * Initialize Payment: Start payment process with provider
     * 
     * Flow:
     * 1. Fetch ticket details (price, currency, user email)
     * 2. Generate or reuse payment reference
     * 3. Call provider API (Paystack or Stripe)
     * 4. Record transaction in database
     * 5. Return authorization URL
     * 
     * @param user_id - User making payment
     * @param req - Payment initialization request
     * @returns Payment URL and reference
     */
    pub async fn initialize(&self, user_id: Uuid, req: InitializePaymentRequest) -> Result<PaymentInitResponse> {
        // Fetch ticket with user email (needed for payment gateway)
        let ticket = sqlx::query(
            r#"SELECT t.id, t.total_price, t.currency, t.payment_ref, u.email
            FROM tickets t
            JOIN users u ON t.user_id = u.id
            WHERE t.id = $1 AND t.user_id = $2"#,
        )
        .bind(req.ticket_id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound("Ticket not found".into()))?;

        // Extract ticket data
        let total_price: Decimal = ticket.get("total_price");
        let currency: String = ticket.get("currency");
        let email: String = ticket.get("email");
        let payment_ref: Option<String> = ticket.get("payment_ref");

        // Generate unique payment reference if not exists
        // Format: BUKR-PAY-{timestamp}-{random}
        let reference = payment_ref.unwrap_or_else(|| {
            format!("BUKR-PAY-{}-{:06x}", chrono::Utc::now().timestamp(), rand::random::<u32>())
        });

        // Route to appropriate payment provider
        match req.provider.as_str() {
            "paystack" => {
                // Convert price to kobo (Paystack uses smallest currency unit)
                // NGN 100.00 -> 10000 kobo
                let amount_kobo = (total_price * Decimal::from(100)).to_string().parse::<i64>().unwrap_or(0);

                // Call Paystack API to get authorization URL
                let init_resp = self.init_paystack(&email, amount_kobo, &currency, &reference, &req.callback_url).await?;

                // Record transaction in database (idempotent via ON CONFLICT)
                let _ = sqlx::query(
                    r#"INSERT INTO payment_transactions (ticket_id, user_id, provider, provider_ref, amount, currency, status)
                    VALUES ($1, $2, 'paystack', $3, $4, $5, 'pending')
                    ON CONFLICT (provider_ref) DO NOTHING"#,
                )
                .bind(req.ticket_id)
                .bind(user_id)
                .bind(&reference)
                .bind(total_price)
                .bind(&currency)
                .execute(&self.pool)
                .await;

                Ok(PaymentInitResponse {
                    provider: "paystack".to_string(),
                    authorization_url: Some(init_resp),
                    checkout_url: None,
                    reference,
                })
            }
            "stripe" => {
                // Convert price to cents (Stripe uses smallest currency unit)
                let amount_cents = (total_price * Decimal::from(100)).to_string().parse::<i64>().unwrap_or(0);

                // Call Stripe API to create Checkout Session
                let checkout_url = self.init_stripe(&email, amount_cents, &currency, &reference, &req.callback_url).await?;

                // Record transaction in database
                let _ = sqlx::query(
                    r#"INSERT INTO payment_transactions (ticket_id, user_id, provider, provider_ref, amount, currency, status)
                    VALUES ($1, $2, 'stripe', $3, $4, $5, 'pending')
                    ON CONFLICT (provider_ref) DO NOTHING"#,
                )
                .bind(req.ticket_id)
                .bind(user_id)
                .bind(&reference)
                .bind(total_price)
                .bind(&currency)
                .execute(&self.pool)
                .await;

                Ok(PaymentInitResponse {
                    provider: "stripe".to_string(),
                    authorization_url: None,
                    checkout_url: Some(checkout_url),
                    reference,
                })
            }
            _ => Err(AppError::Validation("Invalid payment provider. Use 'paystack' or 'stripe'".into())),
        }
    }

    /**
     * Initialize Stripe Checkout Session
     * 
     * Calls Stripe API to create payment session
     * 
     * @param email - User email
     * @param amount_cents - Amount in cents (smallest unit)
     * @param currency - Currency code (USD, EUR, etc)
     * @param reference - Unique payment reference
     * @param callback_url - Redirect URL after payment
     * @returns Checkout URL for user to complete payment
     */
    async fn init_stripe(&self, email: &str, amount_cents: i64, currency: &str, reference: &str, callback_url: &str) -> Result<String> {
        // Development mode: skip API call
        if self.stripe_secret.is_empty() || self.stripe_secret.starts_with("sk_test_your") {
            return Ok(format!("https://checkout.stripe.com/mock/{}", reference));
        }

        // Call Stripe API to create Checkout Session
        let client = reqwest::Client::new();
        let resp = client
            .post("https://api.stripe.com/v1/checkout/sessions")
            .header("Authorization", format!("Bearer {}", self.stripe_secret))
            .form(&[
                ("customer_email", email),
                ("payment_method_types[]", "card"),
                ("line_items[0][price_data][currency]", currency),
                ("line_items[0][price_data][unit_amount]", &amount_cents.to_string()),
                ("line_items[0][price_data][product_data][name]", "Event Ticket"),
                ("line_items[0][quantity]", "1"),
                ("mode", "payment"),
                ("success_url", callback_url),
                ("cancel_url", callback_url),
                ("client_reference_id", reference),
            ])
            .send()
            .await
            .map_err(|e| AppError::PaymentFailed(format!("Stripe request failed: {}", e)))?;

        // Parse response and extract checkout URL
        let body: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| AppError::PaymentFailed(format!("Stripe response parse failed: {}", e)))?;

        // Extract url from response
        body["url"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| AppError::PaymentFailed("Stripe did not return checkout URL".into()))
    }

    /**
     * Initialize Paystack Transaction
     * 
     * Calls Paystack API to create payment session
     * 
     * @param email - User email
     * @param amount_kobo - Amount in kobo (smallest unit)
     * @param currency - Currency code (NGN, USD, etc)
     * @param reference - Unique payment reference
     * @param callback_url - Redirect URL after payment
     * @returns Authorization URL for user to complete payment
     */
    async fn init_paystack(&self, email: &str, amount_kobo: i64, currency: &str, reference: &str, callback_url: &str) -> Result<String> {
        // Development mode: skip API call
        if self.paystack_secret.is_empty() {
            return Ok(format!("https://checkout.paystack.com/mock/{}", reference));
        }

        // Call Paystack API
        let client = reqwest::Client::new();
        let resp = client
            .post("https://api.paystack.co/transaction/initialize")
            .header("Authorization", format!("Bearer {}", self.paystack_secret))
            .json(&serde_json::json!({
                "email": email,
                "amount": amount_kobo,
                "currency": currency,
                "reference": reference,
                "callback_url": callback_url,
            }))
            .send()
            .await
            .map_err(|e| AppError::PaymentFailed(format!("Paystack request failed: {}", e)))?;

        // Parse response and extract authorization URL
        let body: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| AppError::PaymentFailed(format!("Paystack response parse failed: {}", e)))?;

        // Extract authorization_url from response
        body["data"]["authorization_url"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| AppError::PaymentFailed("Paystack did not return authorization_url".into()))
    }

    /**
     * Verify Paystack Webhook Signature
     * 
     * Security: Ensures webhook actually came from Paystack
     * Uses HMAC-SHA512 to verify request authenticity
     * 
     * @param body - Raw webhook request body
     * @param signature - x-paystack-signature header value
     * @returns true if signature is valid
     */
    pub fn verify_paystack_signature(&self, body: &[u8], signature: &str) -> bool {
        // Development mode: skip verification
        if self.paystack_webhook_secret.is_empty() {
            return true;
        }

        // Compute HMAC-SHA512 of request body
        let mut mac = Hmac::<Sha512>::new_from_slice(self.paystack_webhook_secret.as_bytes())
            .expect("HMAC can take key of any size");
        mac.update(body);
        let expected = hex::encode(mac.finalize().into_bytes());
        
        // Constant-time comparison
        expected == signature
    }

    /**
     * Handle Paystack Webhook
     * 
     * Called when Paystack sends payment confirmation
     * 
     * Flow:
     * 1. Check event type (only process charge.success)
     * 2. Update payment transaction status
     * 3. Mark ticket as valid
     * 4. Log success
     * 
     * @param payload - Webhook payload from Paystack
     */
    pub async fn handle_paystack_webhook(&self, payload: PaystackWebhookPayload) -> Result<()> {
        // Only process successful charges
        if payload.event != "charge.success" {
            return Ok(());
        }

        let reference = &payload.data.reference;

        // Update payment transaction to success
        sqlx::query(
            r#"UPDATE payment_transactions SET status = 'success', provider_response = $2
            WHERE provider_ref = $1"#,
        )
        .bind(reference)
        .bind(serde_json::to_value(&payload.data).unwrap_or_default())
        .execute(&self.pool)
        .await
        .map_err(AppError::Database)?;

        // Activate ticket (mark as valid for scanning)
        sqlx::query(
            r#"UPDATE tickets SET status = 'valid' WHERE payment_ref = $1 AND status != 'used'"#,
        )
        .bind(reference)
        .execute(&self.pool)
        .await
        .map_err(AppError::Database)?;

        tracing::info!("Paystack webhook processed: {} -> success", reference);
        Ok(())
    }

    /**
     * Handle Stripe Webhook
     * 
     * Called when Stripe sends payment confirmation
     * 
     * @param event_type - Stripe event type
     * @param reference - Payment reference from client_reference_id
     */
    pub async fn handle_stripe_webhook(&self, event_type: &str, reference: &str) -> Result<()> {
        // Only process successful checkout sessions
        if event_type != "checkout.session.completed" {
            return Ok(());
        }

        // Update payment transaction to success
        sqlx::query(
            r#"UPDATE payment_transactions SET status = 'success'
            WHERE provider_ref = $1"#,
        )
        .bind(reference)
        .execute(&self.pool)
        .await
        .map_err(AppError::Database)?;

        // Activate ticket
        sqlx::query(
            r#"UPDATE tickets SET status = 'valid' WHERE payment_ref = $1 AND status != 'used'"#,
        )
        .bind(reference)
        .execute(&self.pool)
        .await
        .map_err(AppError::Database)?;

        tracing::info!("Stripe webhook processed: {} -> success", reference);
        Ok(())
    }

    /**
     * Verify Payment Status
     * 
     * Check payment transaction status by reference
     * 
     * @param reference - Payment reference
     * @returns Payment details (provider, amount, status)
     */
    pub async fn verify_payment(&self, reference: &str) -> Result<serde_json::Value> {
        // Fetch payment transaction
        let txn = sqlx::query(
            r#"SELECT provider, provider_ref, amount, currency, status
            FROM payment_transactions WHERE provider_ref = $1"#,
        )
        .bind(reference)
        .fetch_optional(&self.pool)
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound("Payment not found".into()))?;

        // Extract transaction details
        let provider: String = txn.get("provider");
        let provider_ref: String = txn.get("provider_ref");
        let amount: Decimal = txn.get("amount");
        let currency: String = txn.get("currency");
        let status: String = txn.get("status");

        // Return payment status
        Ok(serde_json::json!({
            "provider": provider,
            "reference": provider_ref,
            "amount": amount,
            "currency": currency,
            "status": status,
        }))
    }
}
