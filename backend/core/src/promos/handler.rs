use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::error::Result;
use super::dto::{CreatePromoRequest, ValidatePromoRequest};
use super::service::PromoService;
use std::sync::Arc;

pub async fn list_promos(
    State(service): State<Arc<PromoService>>,
    Path(event_id): Path<Uuid>,
) -> Result<Json<Value>> {
    let promos = service.list_by_event(event_id).await?;
    Ok(Json(json!({
        "status": "success",
        "data": { "promos": promos }
    })))
}

pub async fn create_promo(
    State(service): State<Arc<PromoService>>,
    Path(event_id): Path<Uuid>,
    Json(req): Json<CreatePromoRequest>,
) -> Result<Json<Value>> {
    let promo = service.create(event_id, req).await?;
    Ok(Json(json!({
        "status": "success",
        "data": promo
    })))
}

pub async fn delete_promo(
    State(service): State<Arc<PromoService>>,
    Path((event_id, promo_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<Value>> {
    service.delete(promo_id, event_id).await?;
    Ok(Json(json!({
        "status": "success",
        "data": { "message": "Promo code deleted" }
    })))
}

pub async fn toggle_promo(
    State(service): State<Arc<PromoService>>,
    Path((event_id, promo_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<Value>> {
    let promo = service.toggle_active(promo_id, event_id).await?;
    Ok(Json(json!({
        "status": "success",
        "data": promo
    })))
}

pub async fn validate_promo(
    State(service): State<Arc<PromoService>>,
    Json(req): Json<ValidatePromoRequest>,
) -> Result<Json<Value>> {
    let result = service.validate(req).await?;
    Ok(Json(json!({
        "status": "success",
        "data": result
    })))
}
