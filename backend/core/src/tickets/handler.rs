use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::error::Result;
use super::dto::PurchaseTicketRequest;
use super::service::TicketService;
use std::sync::Arc;

pub async fn purchase_ticket(
    State(service): State<Arc<TicketService>>,
    Json(req): Json<PurchaseTicketRequest>,
) -> Result<Json<Value>> {
    // TODO: Extract user_id from JWT claims passed by Go gateway
    // For now, use a header-based approach (Go gateway forwards X-User-ID)
    let user_id = Uuid::new_v4(); // placeholder

    let result = service.purchase(user_id, req).await?;

    Ok(Json(json!({
        "status": "success",
        "data": result
    })))
}

pub async fn get_my_tickets(
    State(service): State<Arc<TicketService>>,
) -> Result<Json<Value>> {
    let user_id = Uuid::new_v4(); // placeholder — extract from forwarded auth header

    let tickets = service.get_user_tickets(user_id).await?;

    Ok(Json(json!({
        "status": "success",
        "data": { "tickets": tickets }
    })))
}

pub async fn get_event_tickets(
    State(service): State<Arc<TicketService>>,
    Path(event_id): Path<Uuid>,
) -> Result<Json<Value>> {
    let tickets = service.get_event_tickets(event_id).await?;

    Ok(Json(json!({
        "status": "success",
        "data": { "tickets": tickets }
    })))
}
