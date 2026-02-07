use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::error::Result;
use super::service::{ScannerService, VerifyAccessRequest, ValidateTicketRequest, ManualValidateRequest};
use std::sync::Arc;

pub async fn verify_access(
    State(service): State<Arc<ScannerService>>,
    Json(req): Json<VerifyAccessRequest>,
) -> Result<Json<Value>> {
    let result = service.verify_access(req).await?;
    Ok(Json(json!({
        "status": "success",
        "data": result
    })))
}

pub async fn validate_ticket(
    State(service): State<Arc<ScannerService>>,
    Json(req): Json<ValidateTicketRequest>,
) -> Result<Json<Value>> {
    let result = service.validate_ticket(req).await?;
    Ok(Json(json!({
        "status": "success",
        "data": result
    })))
}

pub async fn manual_validate(
    State(service): State<Arc<ScannerService>>,
    Json(req): Json<ManualValidateRequest>,
) -> Result<Json<Value>> {
    let result = service.manual_validate(req).await?;
    Ok(Json(json!({
        "status": "success",
        "data": result
    })))
}

pub async fn mark_used(
    State(service): State<Arc<ScannerService>>,
    Path(ticket_id): Path<String>,
) -> Result<Json<Value>> {
    service.mark_used(&ticket_id, None).await?;
    Ok(Json(json!({
        "status": "success",
        "data": { "message": "Ticket marked as used" }
    })))
}

pub async fn get_stats(
    State(service): State<Arc<ScannerService>>,
    Path(event_id): Path<Uuid>,
) -> Result<Json<Value>> {
    let stats = service.get_stats(event_id).await?;
    Ok(Json(json!({
        "status": "success",
        "data": stats
    })))
}
