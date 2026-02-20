/**
 * CONTROLLER LAYER - HTTP Request Handlers
 * 
 * Tickets Handler: The bouncer at the door of ticket operations
 * 
 * Architecture Layer: Controller (Layer 2)
 * Dependencies: TicketService (Use Case Layer), AppError (Domain Layer)
 * Responsibility: Parse HTTP requests, extract auth, delegate to service, format responses
 * 
 * Flow: HTTP Request -> Extract Headers -> Call Service -> Return JSON
 */

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::error::{AppError, Result};
use super::dto::PurchaseTicketRequest;
use super::service::TicketService;
use std::sync::Arc;

/**
 * Extract user_id from X-User-ID header forwarded by Go gateway
 * 
 * Why headers? Because Go already validated the JWT - no need to do it twice
 * Think of it as a VIP pass that Go checked at the main entrance
 * 
 * @param headers - HTTP headers from the request
 * @returns Uuid of the authenticated user, or Unauthorized error
 */
fn extract_user_id(headers: &HeaderMap) -> Result<Uuid> {
    headers
        .get("x-user-id")                    // Look for the magic header
        .and_then(|v| v.to_str().ok())       // Convert bytes to string (safely)
        .and_then(|s| Uuid::parse_str(s).ok()) // Parse string to UUID (safely)
        .ok_or(AppError::Unauthorized)       // If any step fails, user is sus
}

/**
 * POST /api/v1/tickets/purchase
 * 
 * Purchase tickets for an event - where the magic happens
 * 
 * Flow:
 * 1. Extract user_id from headers (who's buying?)
 * 2. Delegate to service layer (do the heavy lifting)
 * 3. Wrap response in standard envelope (consistency is key)
 * 
 * @param service - Injected ticket service (dependency injection FTW)
 * @param headers - HTTP headers containing user auth
 * @param req - Purchase request body (event_id, quantity, promo, etc)
 * @returns JSON response with ticket and payment info
 */
pub async fn purchase_ticket(
    State(service): State<Arc<TicketService>>,
    headers: HeaderMap,
    Json(req): Json<PurchaseTicketRequest>,
) -> Result<Json<Value>> {
    // Who's trying to buy? Extract from the VIP pass
    let user_id = extract_user_id(&headers)?;
    
    // Let the service handle the business logic - we're just the messenger
    let result = service.purchase(user_id, req).await?;

    // Wrap it up in our standard response envelope - consistency is beautiful
    Ok(Json(json!({
        "status": "success",
        "data": result
    })))
}

/**
 * GET /api/v1/tickets/me
 * 
 * Get current user's tickets - show me what I bought
 * 
 * @param service - Ticket service instance
 * @param headers - HTTP headers with user auth
 * @returns JSON array of user's tickets
 */
pub async fn get_my_tickets(
    State(service): State<Arc<TicketService>>,
    headers: HeaderMap,
) -> Result<Json<Value>> {
    // Extract user identity - who's asking?
    let user_id = extract_user_id(&headers)?;
    
    // Fetch tickets from service layer
    let tickets = service.get_user_tickets(user_id).await?;

    // Return wrapped response
    Ok(Json(json!({
        "status": "success",
        "data": { "tickets": tickets }
    })))
}

/**
 * GET /api/v1/tickets/event/:event_id
 * 
 * Get all tickets for an event - organizer's view
 * 
 * Note: Auth middleware ensures only organizers can call this
 * 
 * @param service - Ticket service instance
 * @param event_id - UUID of the event from URL path
 * @returns JSON array of all tickets for the event
 */
pub async fn get_event_tickets(
    State(service): State<Arc<TicketService>>,
    Path(event_id): Path<Uuid>,
) -> Result<Json<Value>> {
    // Fetch all tickets for this event - organizer privilege
    let tickets = service.get_event_tickets(event_id).await?;

    // Wrap and return
    Ok(Json(json!({
        "status": "success",
        "data": { "tickets": tickets }
    })))
}

/**
 * POST /api/v1/tickets/claim-free
 * 
 * Claim free ticket for zero-price event
 * 
 * @param service - Ticket service instance
 * @param headers - HTTP headers with user auth
 * @param req - Claim request with event_id
 * @returns JSON response with ticket
 */
pub async fn claim_free_ticket(
    State(service): State<Arc<TicketService>>,
    headers: HeaderMap,
    Json(req): Json<Value>,
) -> Result<Json<Value>> {
    let user_id = extract_user_id(&headers)?;
    let event_id = req.get("event_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or(AppError::BadRequest("event_id required".into()))?;

    let ticket = service.claim_free(user_id, event_id).await?;

    Ok(Json(json!({
        "status": "success",
        "data": ticket
    })))
}
