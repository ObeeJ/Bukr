/**
 * CONTROLLER LAYER - Promo Code HTTP Handlers
 * 
 * Promo Handler: The discount distributor - managing promotional codes
 * 
 * Architecture Layer: Controller (Layer 2)
 * Dependencies: Service layer (promo business logic)
 * Responsibility: HTTP request/response handling for promo codes
 * 
 * Endpoints:
 * - GET /events/{event_id}/promos: List all promo codes for event
 * - POST /events/{event_id}/promos: Create new promo code
 * - DELETE /events/{event_id}/promos/{promo_id}: Delete promo code
 * - PATCH /events/{event_id}/promos/{promo_id}/toggle: Enable/disable promo
 * - POST /promos/validate: Validate promo code for ticket purchase
 * 
 * Use Cases:
 * 1. Event organizers create discount codes
 * 2. Users apply promo codes during checkout
 * 3. System validates code availability and limits
 */

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

/**
 * List Promo Codes
 * 
 * Fetch all promo codes for an event
 * Shows active, inactive, and expired codes
 * 
 * @param service - Promo service instance
 * @param event_id - Event ID
 * @returns List of promo codes
 */
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

/**
 * Create Promo Code
 * 
 * Event organizers create discount codes
 * 
 * Features:
 * - Percentage discount (10%, 20%, etc)
 * - Usage limits (100 tickets max)
 * - Expiration dates
 * - Active/inactive toggle
 * 
 * @param service - Promo service instance
 * @param event_id - Event ID
 * @param req - Promo creation request
 * @returns Created promo code
 */
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

/**
 * Delete Promo Code
 * 
 * Remove promo code from event
 * Does not affect already-used tickets
 * 
 * @param service - Promo service instance
 * @param event_id - Event ID
 * @param promo_id - Promo code ID
 * @returns Success confirmation
 */
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

/**
 * Toggle Promo Active Status
 * 
 * Enable or disable promo code
 * Useful for pausing codes without deleting
 * 
 * @param service - Promo service instance
 * @param event_id - Event ID
 * @param promo_id - Promo code ID
 * @returns Updated promo code
 */
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

/**
 * Validate Promo Code
 * 
 * Check if promo code is valid for ticket purchase
 * Called during checkout process
 * 
 * Validation checks:
 * - Code exists for event
 * - Code is active
 * - Not expired
 * - Usage limit not reached
 * 
 * @param service - Promo service instance
 * @param req - Validation request (event_id, code)
 * @returns Discount percentage and remaining uses
 */
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
