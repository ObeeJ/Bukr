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
use crate::fees::{compute_fees, FeeMode};

#[derive(Debug, Deserialize)]
pub struct InitializePaymentRequest {
    pub ticket_id: Uuid,
    pub provider: String,
    pub callback_url: String,
}

#[derive(Debug, Serialize)]
pub struct PaymentInitResponse {
    pub provider: String,
    pub authorization_url: Option<String>,
    pub reference: String,
}

#[derive(Debug, Deserialize)]
pub struct PaystackWebhookPayload {
    pub event: String,
    pub data: PaystackWebhookData,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PaystackWebhookData {
    pub reference: String,
    pub status: String,
    pub amount: i64,
    pub currency: String,
}

pub struct PaymentService {
    pool: PgPool,
    paystack_secret: String,
    paystack_webhook_secret: String,
    // Shared client — connection pool reused across all Paystack calls.
    http: reqwest::Client,
}

impl PaymentService {
    pub fn new(
        pool: PgPool,
        paystack_secret: String,
        paystack_webhook_secret: String,
    ) -> Self {
        Self {
            pool,
            paystack_secret,
            paystack_webhook_secret,
            http: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(10))
                .build()
                .expect("reqwest client build failed"),
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
        // Fetch ticket with user email (needed for payment gateway).
        // Also fetch unit_price + quantity so we can compute the Bukr fee breakdown.
        let ticket = sqlx::query(
            r#"SELECT t.id, t.total_price, t.unit_price, t.quantity, t.currency, t.payment_ref, u.email
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
        let total_price: Decimal  = ticket.get("total_price");
        let unit_price: Decimal   = ticket.get("unit_price");
        let quantity: i32         = ticket.get("quantity");
        let currency: String      = ticket.get("currency");
        let email: String         = ticket.get("email");
        let payment_ref: Option<String> = ticket.get("payment_ref");

        // Generate unique payment reference if not exists
        // Format: BUKR-PAY-{timestamp}-{random}
        let reference = payment_ref.unwrap_or_else(|| {
            format!("BUKR-PAY-{}-{:06x}", chrono::Utc::now().timestamp(), rand::random::<u32>())
        });

        // ─── FEE COMPUTATION (delegates to unified fees engine) ───────────
        let fee_mode = FeeMode::default(); // reads event.fee_mode in future
        let fees = compute_fees(unit_price, quantity, &fee_mode);
        let platform_fee   = fees.platform_fee;
        let bukrshield_fee = fees.bukrshield_fee;
        let organizer_payout = fees.organizer_payout;
        // ─────────────────────────────────────────────────────────────────

        match req.provider.as_str() {
            "paystack" => {
                let amount_kobo = (total_price * Decimal::from(100)).to_string().parse::<i64>().unwrap_or(0);
                let init_resp = self.init_paystack(&email, amount_kobo, &currency, &reference, &req.callback_url).await?;

                let _ = sqlx::query(
                    r#"INSERT INTO payment_transactions
                       (ticket_id, user_id, provider, provider_ref, amount, currency, status,
                        platform_fee, bukrshield_fee, organizer_payout)
                    VALUES ($1, $2, 'paystack', $3, $4, $5, 'pending', $6, $7, $8)
                    ON CONFLICT (provider_ref) DO NOTHING"#,
                )
                .bind(req.ticket_id)
                .bind(user_id)
                .bind(&reference)
                .bind(total_price)
                .bind(&currency)
                .bind(platform_fee)
                .bind(bukrshield_fee)
                .bind(organizer_payout)
                .execute(&self.pool)
                .await;

                Ok(PaymentInitResponse {
                    provider: "paystack".to_string(),
                    authorization_url: Some(init_resp),
                    reference,
                })
            }
            _ => Err(AppError::Validation("Only 'paystack' is supported".into())),
        }
    }

    async fn init_paystack(&self, email: &str, amount_kobo: i64, currency: &str, reference: &str, callback_url: &str) -> Result<String> {
        if self.paystack_secret.is_empty() {
            return Ok(format!("https://checkout.paystack.com/mock/{}", reference));
        }

        let resp = self.http
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

        let body: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| AppError::PaymentFailed(format!("Paystack response parse failed: {}", e)))?;

        body["data"]["authorization_url"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| AppError::PaymentFailed("Paystack did not return authorization_url".into()))
    }

    pub fn verify_paystack_signature(&self, body: &[u8], signature: &str) -> bool {
        // Fail-closed: no secret configured means reject all webhooks.
        // An empty secret in production is a misconfiguration, not a free pass.
        if self.paystack_webhook_secret.is_empty() {
            tracing::warn!("PAYSTACK_WEBHOOK_SECRET is empty — rejecting webhook");
            return false;
        }
        let mut mac = Hmac::<Sha512>::new_from_slice(self.paystack_webhook_secret.as_bytes())
            .expect("HMAC can take key of any size");
        mac.update(body);
        let expected = hex::encode(mac.finalize().into_bytes());
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
