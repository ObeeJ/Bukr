/**
 * CONTROLLER LAYER — Vendor HTTP Handlers
 *
 * Routes all vendor marketplace requests to the VendorService.
 * Auth is carried via the X-User-ID header injected by the Go gateway after JWT validation.
 * X-User-Type is checked where role restrictions apply (vendor / organizer).
 */

use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::error::{AppError, Result};
use super::dto::{
    AvailabilitySetRequest, CompleteHireRequest, CreateVendorRequest, HireRequest,
    HireRespondRequest, InviteVendorRequest, ReviewRequest, VendorSearchParams,
};
use super::service::VendorService;
use std::sync::Arc;

// ── AUTH HELPERS ──────────────────────────────────────────────────────────────

fn extract_user_id(headers: &HeaderMap) -> Result<Uuid> {
    headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or(AppError::Unauthorized)
}

fn optional_user_id(headers: &HeaderMap) -> Option<Uuid> {
    headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
}

fn require_user_type(headers: &HeaderMap, required: &str) -> Result<Uuid> {
    let user_id = extract_user_id(headers)?;
    let user_type = headers
        .get("x-user-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if user_type != required {
        return Err(AppError::Forbidden);
    }
    Ok(user_id)
}

// ── VENDOR PROFILE ENDPOINTS ──────────────────────────────────────────────────

/// GET /api/v1/vendors
/// Browse the vendor marketplace with optional filters.
pub async fn search_vendors(
    State(service): State<Arc<VendorService>>,
    Query(params): Query<VendorSearchParams>,
) -> Result<Json<Value>> {
    let result = service.search(params).await?;
    Ok(Json(json!({ "status": "success", "data": result })))
}

/// POST /api/v1/vendors
/// Register the calling user as a vendor.
pub async fn register_vendor(
    State(service): State<Arc<VendorService>>,
    headers: HeaderMap,
    Json(req): Json<CreateVendorRequest>,
) -> Result<Json<Value>> {
    let user_id = extract_user_id(&headers)?;
    let vendor = service.register(user_id, req).await?;
    Ok(Json(json!({ "status": "success", "data": vendor })))
}

/// GET /api/v1/vendors/:id
/// Fetch a single vendor profile. Increments profile_views for authenticated viewers.
pub async fn get_vendor(
    State(service): State<Arc<VendorService>>,
    Path(vendor_id): Path<Uuid>,
    headers: HeaderMap,
) -> Result<Json<Value>> {
    let viewer_id = optional_user_id(&headers);
    let vendor = service.get_vendor(vendor_id, viewer_id).await?;
    Ok(Json(json!({ "status": "success", "data": vendor })))
}

/// GET /api/v1/vendors/match?event_id=<uuid>
/// AI matchmaking: returns top-5 scored vendors per category for the given event.
pub async fn match_vendors(
    State(service): State<Arc<VendorService>>,
    headers: HeaderMap,
    Query(params): Query<MatchQueryParams>,
) -> Result<Json<Value>> {
    // Organizer only — only they have events to match vendors for
    let _organizer_id = require_user_type(&headers, "organizer")?;
    let results = service.match_vendors_for_event(params.event_id).await?;
    Ok(Json(json!({ "status": "success", "data": results })))
}

#[derive(serde::Deserialize)]
pub struct MatchQueryParams {
    pub event_id: Uuid,
}

// ── VENDOR SELF-SERVICE ───────────────────────────────────────────────────────

/// POST /api/v1/vendors/availability
/// Vendor marks date ranges as booked or available on their calendar.
pub async fn set_availability(
    State(service): State<Arc<VendorService>>,
    headers: HeaderMap,
    Json(req): Json<AvailabilitySetRequest>,
) -> Result<Json<Value>> {
    let vendor_id = require_user_type(&headers, "vendor")?;
    // vendor_id here is the user_id; the service will resolve to the vendor record
    service.set_availability(vendor_id, req).await?;
    Ok(Json(json!({ "status": "success", "message": "Availability updated" })))
}

/// GET /api/v1/vendor/me/hires
/// Vendor views their own incoming hire requests.
pub async fn get_my_hires(
    State(service): State<Arc<VendorService>>,
    headers: HeaderMap,
) -> Result<Json<Value>> {
    let vendor_user_id = require_user_type(&headers, "vendor")?;
    let hires = service.get_my_hires_as_vendor(vendor_user_id).await?;
    Ok(Json(json!({ "status": "success", "data": { "hires": hires } })))
}

// ── HIRE LIFECYCLE ────────────────────────────────────────────────────────────

/// POST /api/v1/vendor-hires
/// Organizer sends a hire request to a vendor.
pub async fn request_hire(
    State(service): State<Arc<VendorService>>,
    headers: HeaderMap,
    Json(req): Json<HireRequest>,
) -> Result<Json<Value>> {
    let organizer_id = require_user_type(&headers, "organizer")?;
    let hire = service.request_hire(organizer_id, req).await?;
    Ok(Json(json!({ "status": "success", "data": hire })))
}

/// POST /api/v1/vendor-hires/:id/respond
/// Vendor accepts, declines, or counter-offers a hire request.
pub async fn respond_hire(
    State(service): State<Arc<VendorService>>,
    Path(hire_id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<HireRespondRequest>,
) -> Result<Json<Value>> {
    let vendor_user_id = require_user_type(&headers, "vendor")?;
    let hire = service.respond_hire(vendor_user_id, hire_id, req).await?;
    Ok(Json(json!({ "status": "success", "data": hire })))
}

/// POST /api/v1/vendor-hires/:id/complete
/// Organizer marks a hire as completed — triggers commission ledger entry.
pub async fn complete_hire(
    State(service): State<Arc<VendorService>>,
    Path(hire_id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<CompleteHireRequest>,
) -> Result<Json<Value>> {
    let organizer_id = require_user_type(&headers, "organizer")?;
    let hire = service.complete_hire(organizer_id, hire_id, req).await?;
    Ok(Json(json!({ "status": "success", "data": hire })))
}

// ── REVIEWS ───────────────────────────────────────────────────────────────────

/// POST /api/v1/vendor-reviews
/// Organizer submits a review after an event. DB trigger recomputes Bayesian rating.
pub async fn submit_review(
    State(service): State<Arc<VendorService>>,
    headers: HeaderMap,
    Json(req): Json<ReviewRequest>,
) -> Result<Json<Value>> {
    let reviewer_id = require_user_type(&headers, "organizer")?;
    let review = service.submit_review(reviewer_id, req).await?;
    Ok(Json(json!({ "status": "success", "data": review })))
}

// ── INVITATIONS ───────────────────────────────────────────────────────────────

/// POST /api/v1/vendor-invitations
/// Organizer invites an external (non-Bukr) vendor by email.
pub async fn send_invitation(
    State(service): State<Arc<VendorService>>,
    headers: HeaderMap,
    Json(req): Json<InviteVendorRequest>,
) -> Result<Json<Value>> {
    let organizer_id = require_user_type(&headers, "organizer")?;
    let invite = service.send_invitation(organizer_id, req).await?;
    Ok(Json(json!({ "status": "success", "data": invite })))
}

/// GET /api/v1/vendor-invitations/claim/:token
/// Public endpoint — invited vendor visits this link to claim their profile.
pub async fn claim_invitation(
    State(service): State<Arc<VendorService>>,
    Path(token): Path<String>,
    headers: HeaderMap,
) -> Result<Json<Value>> {
    // Must be logged in to claim
    let _user_id = extract_user_id(&headers)?;
    let invite = service.claim_invitation(&token).await?;
    Ok(Json(json!({ "status": "success", "data": invite, "message": "Invitation claimed — welcome to Bukr!" })))
}
