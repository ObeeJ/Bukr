/**
 * CONTROLLER LAYER - HTTP Request Handlers
 * 
 * Payments Handler: The cashier of Bukr - where money talks
 * 
 * Architecture Layer: Controller (Layer 2)
 * Dependencies: PaymentService (Use Case Layer), AppError (Domain Layer)
 * Responsibility: Handle payment initialization, webhooks, verification
 * 
 * Flow: HTTP Request -> Extract Auth -> Delegate to Service -> Return Response
 */

use axum::{
    body::Bytes,
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::error::{AppError, Result};
use super::service::{PaymentService, InitializePaymentRequest, PaystackWebhookPayload};
use std::sync::Arc;

/**
 * Extract user_id from X-User-ID header forwarded by Go gateway
 * 
 * Same pattern as tickets - Go validates JWT, we trust the header
 * Security note: This only works because Rust service is internal-only
 * 
 * @param headers - HTTP headers from request
 * @returns User UUID or Unauthorized error
 */
fn extract_user_id(headers: &HeaderMap) -> Result<Uuid> {
    headers
        .get("x-user-id")                    // Look for the VIP pass
        .and_then(|v| v.to_str().ok())       // Bytes to string
        .and_then(|s| Uuid::parse_str(s).ok()) // String to UUID
        .ok_or(AppError::Unauthorized)       // Fail if any step fails
}

/**
 * POST /api/v1/payments/initialize
 * 
 * Initialize payment with Paystack or Stripe
 * 
 * This doesn't charge the card - it just creates a checkout session
 * User gets redirected to payment gateway to complete payment
 * 
 * Flow:
 * 1. Extract user_id from headers
 * 2. Service creates payment session with provider
 * 3. Return checkout URL for redirect
 * 
 * @param service - Payment service instance
 * @param headers - HTTP headers with auth
 * @param req - Payment initialization request
 * @returns Checkout URL and payment reference
 */
pub async fn initialize_payment(
    State(service): State<Arc<PaymentService>>,
    headers: HeaderMap,
    Json(req): Json<InitializePaymentRequest>,
) -> Result<Json<Value>> {
    // Who's trying to pay? Extract from header
    let user_id = extract_user_id(&headers)?;
    
    // Let service handle the payment provider API calls
    let result = service.initialize(user_id, req).await?;
    
    // Return standard response envelope
    Ok(Json(json!({
        "status": "success",
        "data": result
    })))
}

/**
 * POST /api/v1/payments/webhook/paystack
 * 
 * Paystack webhook handler - called by Paystack when payment completes
 * 
 * Security: Validates signature to ensure request is from Paystack
 * This is PUBLIC endpoint - no auth middleware, signature is the auth
 * 
 * Flow:
 * 1. Extract signature from header
 * 2. Verify signature with HMAC SHA512
 * 3. Parse webhook payload
 * 4. Update ticket status based on payment result
 * 
 * @param service - Payment service instance
 * @param headers - HTTP headers (contains signature)
 * @param body - Raw request body (needed for signature verification)
 * @returns 200 OK if processed, error otherwise
 */
pub async fn paystack_webhook(
    State(service): State<Arc<PaymentService>>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Json<Value>> {
    // Extract Paystack signature - this is our authentication
    let signature = headers
        .get("x-paystack-signature")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");  // Empty string if missing - will fail verification

    // Verify signature - if this fails, request is not from Paystack
    if !service.verify_paystack_signature(&body, signature) {
        return Err(AppError::Unauthorized);
    }

    // Parse JSON payload - Paystack sends event data
    let payload: PaystackWebhookPayload = serde_json::from_slice(&body)
        .map_err(|e| AppError::Validation(format!("Invalid webhook payload: {}", e)))?;

    // Process the webhook - update ticket status, log transaction, etc
    service.handle_paystack_webhook(payload).await?;

    // Return simple OK - Paystack just needs to know we received it
    Ok(Json(json!({ "status": "ok" })))
}

/**
 * POST /api/v1/payments/webhook/stripe
 * 
 * Stripe webhook handler - called by Stripe when payment completes
 * 
 * Security: Validates signature to ensure request is from Stripe
 * This is PUBLIC endpoint - no auth middleware, signature is the auth
 * 
 * @param service - Payment service instance
 * @param headers - HTTP headers (contains signature)
 * @param body - Raw request body (needed for signature verification)
 * @returns 200 OK if processed, error otherwise
 */
pub async fn stripe_webhook(
    State(service): State<Arc<PaymentService>>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Json<Value>> {
    // Extract Stripe signature
    let signature = headers
        .get("stripe-signature")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    // Parse JSON payload
    let payload: Value = serde_json::from_slice(&body)
        .map_err(|e| AppError::Validation(format!("Invalid webhook payload: {}", e)))?;

    // Extract event type and reference
    let event_type = payload["type"].as_str().unwrap_or("");
    let reference = payload["data"]["object"]["client_reference_id"]
        .as_str()
        .unwrap_or("");

    // Process the webhook
    service.handle_stripe_webhook(event_type, reference).await?;

    Ok(Json(json!({ "status": "ok" })))
}

/**
 * GET /api/v1/payments/:reference/verify
 * 
 * Verify payment status - did the payment go through?
 * 
 * Called by frontend after user returns from payment gateway
 * Checks with Paystack/Stripe API to confirm payment status
 * 
 * @param service - Payment service instance
 * @param reference - Payment reference (BUKR-PAY-xxx)
 * @returns Payment status and details
 */
pub async fn verify_payment(
    State(service): State<Arc<PaymentService>>,
    Path(reference): Path<String>,
) -> Result<Json<Value>> {
    // Ask service to verify with payment provider
    let result = service.verify_payment(&reference).await?;
    
    // Return verification result
    Ok(Json(json!({
        "status": "success",
        "data": result
    })))
}
