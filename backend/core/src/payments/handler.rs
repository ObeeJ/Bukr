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

fn extract_user_id(headers: &HeaderMap) -> Result<Uuid> {
    headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or(AppError::Unauthorized)
}

pub async fn initialize_payment(
    State(service): State<Arc<PaymentService>>,
    headers: HeaderMap,
    Json(req): Json<InitializePaymentRequest>,
) -> Result<Json<Value>> {
    let user_id = extract_user_id(&headers)?;
    let result = service.initialize(user_id, req).await?;
    Ok(Json(json!({ "status": "success", "data": result })))
}

pub async fn paystack_webhook(
    State(service): State<Arc<PaymentService>>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Json<Value>> {
    let signature = headers
        .get("x-paystack-signature")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if !service.verify_paystack_signature(&body, signature) {
        return Err(AppError::Unauthorized);
    }

    let payload: PaystackWebhookPayload = serde_json::from_slice(&body)
        .map_err(|e| AppError::Validation(format!("Invalid webhook payload: {}", e)))?;

    service.handle_paystack_webhook(payload).await?;
    Ok(Json(json!({ "status": "ok" })))
}

pub async fn verify_payment(
    State(service): State<Arc<PaymentService>>,
    Path(reference): Path<String>,
) -> Result<Json<Value>> {
    let result = service.verify_payment(&reference).await?;
    Ok(Json(json!({ "status": "success", "data": result })))
}
