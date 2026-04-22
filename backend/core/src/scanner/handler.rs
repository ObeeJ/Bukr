// Scanner HTTP handlers — thin layer, all logic in ScannerService.

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::error::{AppError, Result};
use super::service::{
    ScannerService, VerifyAccessRequest, ValidateTicketRequest,
    ManualValidateRequest, RenewTicketRequest,
};
use std::sync::Arc;

fn extract_user_id(headers: &HeaderMap) -> Option<Uuid> {
    headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
}

pub async fn verify_access(
    State(service): State<Arc<ScannerService>>,
    Json(req): Json<VerifyAccessRequest>,
) -> Result<Json<Value>> {
    let result = service.verify_access(req).await?;
    Ok(Json(json!({ "status": "success", "data": result })))
}

pub async fn validate_ticket(
    State(service): State<Arc<ScannerService>>,
    Json(req): Json<ValidateTicketRequest>,
) -> Result<Json<Value>> {
    let result = service.validate_ticket(req).await?;
    Ok(Json(json!({ "status": "success", "data": result })))
}

pub async fn manual_validate(
    State(service): State<Arc<ScannerService>>,
    headers: HeaderMap,
    Json(req): Json<ManualValidateRequest>,
) -> Result<Json<Value>> {
    let scanned_by = extract_user_id(&headers)
        .ok_or(AppError::Unauthorized)?;
    
    let result = service.manual_validate(req, scanned_by).await?;
    Ok(Json(json!({ "status": "success", "data": result })))
}

pub async fn mark_used(
    State(service): State<Arc<ScannerService>>,
    Path(ticket_id): Path<String>,
) -> Result<Json<Value>> {
    service.mark_used(&ticket_id, None).await?;
    Ok(Json(json!({ "status": "success", "data": { "message": "Ticket marked as used" } })))
}

pub async fn get_stats(
    State(service): State<Arc<ScannerService>>,
    Path(event_id): Path<Uuid>,
) -> Result<Json<Value>> {
    let stats = service.get_stats(event_id).await?;
    Ok(Json(json!({ "status": "success", "data": stats })))
}

pub async fn renew_ticket(
    State(service): State<Arc<ScannerService>>,
    headers: HeaderMap,
    Path(ticket_id): Path<String>,
) -> Result<Json<Value>> {
    let user_id = extract_user_id(&headers)
        .ok_or(AppError::Unauthorized)?;

    let result = service.renew_ticket(RenewTicketRequest { ticket_id, user_id }).await?;
    Ok(Json(json!({ "status": "success", "data": result })))
}
