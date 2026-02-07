use hmac::{Hmac, Mac};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sha2::Sha512;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::{AppError, Result};

#[derive(Debug, Deserialize)]
pub struct InitializePaymentRequest {
    pub ticket_id: Uuid,
    pub provider: String, // "paystack" | "stripe"
    pub callback_url: String,
}

#[derive(Debug, Serialize)]
pub struct PaymentInitResponse {
    pub provider: String,
    pub authorization_url: Option<String>,
    pub checkout_url: Option<String>,
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
    stripe_secret: String,
    paystack_webhook_secret: String,
    stripe_webhook_secret: String,
}

impl PaymentService {
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

    pub async fn initialize(&self, user_id: Uuid, req: InitializePaymentRequest) -> Result<PaymentInitResponse> {
        // Look up ticket details
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

        let total_price: Decimal = ticket.get("total_price");
        let currency: String = ticket.get("currency");
        let email: String = ticket.get("email");
        let payment_ref: Option<String> = ticket.get("payment_ref");

        let reference = payment_ref.unwrap_or_else(|| {
            format!("BUKR-PAY-{}-{:06x}", chrono::Utc::now().timestamp(), rand::random::<u32>())
        });

        match req.provider.as_str() {
            "paystack" => {
                let amount_kobo = (total_price * Decimal::from(100)).to_string().parse::<i64>().unwrap_or(0);

                let init_resp = self.init_paystack(&email, amount_kobo, &currency, &reference, &req.callback_url).await?;

                // Record transaction
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
                // Stripe checkout session would be created here
                Ok(PaymentInitResponse {
                    provider: "stripe".to_string(),
                    authorization_url: None,
                    checkout_url: Some(format!("https://checkout.stripe.com/placeholder/{}", reference)),
                    reference,
                })
            }
            _ => Err(AppError::Validation("Invalid payment provider. Use 'paystack' or 'stripe'".into())),
        }
    }

    async fn init_paystack(&self, email: &str, amount_kobo: i64, currency: &str, reference: &str, callback_url: &str) -> Result<String> {
        if self.paystack_secret.is_empty() {
            // Development mode: return mock URL
            return Ok(format!("https://checkout.paystack.com/mock/{}", reference));
        }

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
        if self.paystack_webhook_secret.is_empty() {
            return true; // Dev mode
        }

        let mut mac = Hmac::<Sha512>::new_from_slice(self.paystack_webhook_secret.as_bytes())
            .expect("HMAC can take key of any size");
        mac.update(body);
        let expected = hex::encode(mac.finalize().into_bytes());
        expected == signature
    }

    pub async fn handle_paystack_webhook(&self, payload: PaystackWebhookPayload) -> Result<()> {
        if payload.event != "charge.success" {
            return Ok(()); // Ignore non-success events
        }

        let reference = &payload.data.reference;

        // Update payment transaction
        sqlx::query(
            r#"UPDATE payment_transactions SET status = 'success', provider_response = $2
            WHERE provider_ref = $1"#,
        )
        .bind(reference)
        .bind(serde_json::to_value(&payload.data).unwrap_or_default())
        .execute(&self.pool)
        .await
        .map_err(AppError::Database)?;

        // Update ticket status to valid (in case it was pending)
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
        let txn = sqlx::query(
            r#"SELECT provider, provider_ref, amount, currency, status
            FROM payment_transactions WHERE provider_ref = $1"#,
        )
        .bind(reference)
        .fetch_optional(&self.pool)
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound("Payment not found".into()))?;

        let provider: String = txn.get("provider");
        let provider_ref: String = txn.get("provider_ref");
        let amount: Decimal = txn.get("amount");
        let currency: String = txn.get("currency");
        let status: String = txn.get("status");

        Ok(serde_json::json!({
            "provider": provider,
            "reference": provider_ref,
            "amount": amount,
            "currency": currency,
            "status": status,
        }))
    }
}
