/**
 * CONTROLLER LAYER - Scanner HTTP Handlers
 * 
 * Scanner Handler: The gatekeeper - validating tickets at event entrances
 * 
 * Architecture Layer: Controller (Layer 2)
 * Dependencies: Service layer (scanner business logic)
 * Responsibility: HTTP request/response handling for ticket scanning
 * 
 * Endpoints:
 * - POST /verify-access: Verify scanner access code
 * - POST /validate-ticket: Validate ticket QR code
 * - POST /manual-validate: Manual ticket validation
 * - POST /mark-used/{ticket_id}: Mark ticket as used
 * - GET /stats/{event_id}: Get scanning statistics
 * 
 * Use Cases:
 * 1. Scanner app verifies access code before scanning
 * 2. Scanner validates QR code at gate
 * 3. Manual validation for damaged QR codes
 * 4. Real-time scanning statistics
 */

use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::error::Result;
use super::service::{ScannerService, VerifyAccessRequest, ValidateTicketRequest, ManualValidateRequest};
use std::sync::Arc;

/**
 * Verify Scanner Access
 * 
 * Validates scanner access code before allowing ticket scanning
 * Security: Ensures only authorized scanners can validate tickets
 * 
 * @param service - Scanner service instance
 * @param req - Access verification request (event_id, access_code)
 * @returns Verification result with event details
 */
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

/**
 * Validate Ticket via QR Code
 * 
 * Scans and validates ticket QR code at event entrance
 * 
 * Flow:
 * 1. Parse QR data (JSON with ticketId)
 * 2. Validate ticket belongs to event
 * 3. Check ticket status (valid, used, invalid)
 * 4. Return validation result
 * 
 * @param service - Scanner service instance
 * @param req - Validation request (qr_data, event_id)
 * @returns Scan result (valid, already_used, invalid)
 */
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

/**
 * Manual Ticket Validation
 * 
 * Fallback for damaged/unreadable QR codes
 * Scanner manually enters ticket ID
 * 
 * @param service - Scanner service instance
 * @param req - Manual validation request (ticket_id, event_id)
 * @returns Scan result
 */
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

/**
 * Mark Ticket as Used
 * 
 * Final step: mark validated ticket as used
 * Prevents double-entry with same ticket
 * 
 * @param service - Scanner service instance
 * @param ticket_id - Ticket ID to mark as used
 * @returns Success confirmation
 */
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

/**
 * Get Scanning Statistics
 * 
 * Real-time event scanning metrics
 * Shows: total tickets, scanned count, remaining, scan rate
 * 
 * Use Case: Event organizers monitor gate activity
 * 
 * @param service - Scanner service instance
 * @param event_id - Event ID
 * @returns Scanning statistics
 */
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
