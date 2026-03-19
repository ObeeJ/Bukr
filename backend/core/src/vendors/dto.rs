/**
 * DOMAIN LAYER — Vendor DTOs
 *
 * All request/response data shapes for the vendor marketplace.
 * Kept flat and serialization-ready — no business logic here.
 */

use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ── REQUEST DTOs ──────────────────────────────────────────────────────────────

/// Everything needed to register as a vendor on Bukr.
#[derive(Debug, Deserialize)]
pub struct CreateVendorRequest {
    pub business_name:    String,
    pub category:         String,          // Must match CHECK constraint in vendors table
    pub bio:              Option<String>,
    pub location:         String,          // Full address string
    pub city:             String,          // Extracted city for matching (e.g. "Lagos")
    pub serves_nationwide: bool,           // true = will travel anywhere
    pub portfolio_urls:   Option<Vec<String>>, // Up to 6 image URLs
    pub commission_only:  bool,            // true = free tier with 8% commission
}

/// Update existing vendor profile.
#[derive(Debug, Deserialize)]
pub struct UpdateVendorRequest {
    pub business_name:     Option<String>,
    pub bio:               Option<String>,
    pub location:          Option<String>,
    pub city:              Option<String>,
    pub serves_nationwide: Option<bool>,
    pub portfolio_urls:    Option<Vec<String>>,
    pub is_available:      Option<bool>,
}

/// Search/filter parameters for the vendor marketplace.
#[derive(Debug, Deserialize, Default)]
pub struct VendorSearchParams {
    pub category:   Option<String>,   // Filter by vendor category
    pub city:       Option<String>,   // Filter by city (case-insensitive match)
    pub date:       Option<String>,   // ISO date — check availability on this day
    pub min_rating: Option<f64>,      // Minimum raw rating (0.0–5.0)
    pub tier:       Option<String>,   // "free" | "verified" | "pro"
    pub page:       Option<i64>,      // 1-based pagination
    pub limit:      Option<i64>,      // Max results per page (default 20)
}

/// Organizer sends a hire request to a vendor.
#[derive(Debug, Deserialize)]
pub struct HireRequest {
    pub vendor_id:       Uuid,
    pub event_id:        Uuid,
    pub proposed_amount: Option<Decimal>, // Organizer's budget offer
    pub message:         Option<String>,
}

/// Vendor responds to a hire request (accept, decline, or counter).
#[derive(Debug, Deserialize)]
pub struct HireRespondRequest {
    pub accept:        bool,
    pub counter_amount: Option<Decimal>, // Only set if !accept and vendor wants to negotiate
}

/// Organizer marks a hire as completed — triggers commission calculation.
#[derive(Debug, Deserialize)]
pub struct CompleteHireRequest {
    pub agreed_amount: Decimal, // Final agreed payment amount
}

/// Submit a review for a vendor after an event.
#[derive(Debug, Deserialize)]
pub struct ReviewRequest {
    pub hire_id:  Uuid,
    pub rating:   i32,          // 1–5
    pub review:   Option<String>,
}

/// Set vendor availability for a range of dates.
#[derive(Debug, Deserialize)]
pub struct AvailabilitySetRequest {
    pub dates:     Vec<String>, // ISO date strings "YYYY-MM-DD"
    pub is_booked: bool,        // true = mark booked, false = mark available
}

/// Organizer invites an external (non-Bukr) vendor to join the platform.
#[derive(Debug, Deserialize)]
pub struct InviteVendorRequest {
    pub email:    String,
    pub event_id: Option<Uuid>,
    pub message:  Option<String>,
}

// ── RESPONSE DTOs ─────────────────────────────────────────────────────────────

/// Full vendor profile as returned to clients.
#[derive(Debug, Serialize)]
pub struct VendorResponse {
    pub id:                Uuid,
    pub user_id:           Uuid,
    pub business_name:     String,
    pub category:          String,
    pub bio:               Option<String>,
    pub location:          String,
    pub city:              String,
    pub serves_nationwide: bool,
    pub portfolio_urls:    Vec<String>,
    pub tier:              String,
    pub commission_rate:   Decimal,
    pub rating:            Decimal,         // Raw average rating
    pub bayesian_rating:   Decimal,         // Bayesian-smoothed rating (used for ranking)
    pub review_count:      i32,
    pub hire_count:        i32,
    pub completion_rate:   Decimal,
    pub response_rate:     Decimal,
    pub is_verified:       bool,
    pub is_available:      bool,
    pub profile_views:     i32,
    pub created_at:        DateTime<Utc>,
}

/// Vendor with a composite match score — used in AI matchmaking results.
#[derive(Debug, Serialize)]
pub struct ScoredVendor {
    pub vendor:        VendorResponse,
    pub score:         f64,              // Composite score 0–100
    pub match_reasons: Vec<String>,      // Human-readable reasons: ["City match", "Verified", ...]
}

/// Matchmaking result grouped by vendor category.
#[derive(Debug, Serialize)]
pub struct VendorMatchResult {
    pub category: String,
    pub vendors:  Vec<ScoredVendor>,
}

/// Full hire record response.
#[derive(Debug, Serialize)]
pub struct HireResponse {
    pub id:              Uuid,
    pub event_id:        Uuid,
    pub vendor_id:       Uuid,
    pub organizer_id:    Uuid,
    pub proposed_amount: Option<Decimal>,
    pub agreed_amount:   Option<Decimal>,
    pub bukr_commission: Option<Decimal>,
    pub commission_rate: Decimal,
    pub status:          String,
    pub message:         Option<String>,
    pub counter_amount:  Option<Decimal>,
    pub created_at:      DateTime<Utc>,
    pub updated_at:      DateTime<Utc>,
}

/// A single review record.
#[derive(Debug, Serialize)]
pub struct ReviewResponse {
    pub id:          Uuid,
    pub vendor_id:   Uuid,
    pub reviewer_id: Uuid,
    pub hire_id:     Uuid,
    pub rating:      i32,
    pub review:      Option<String>,
    pub created_at:  DateTime<Utc>,
}

/// Response after sending a vendor invitation.
#[derive(Debug, Serialize)]
pub struct InviteResponse {
    pub invitation_id: Uuid,
    pub email:         String,
    pub token:         String,  // The signed invite token (embed in email link)
    pub expires_at:    DateTime<Utc>,
}

/// Paginated vendor list response.
#[derive(Debug, Serialize)]
pub struct VendorListResponse {
    pub vendors:    Vec<VendorResponse>,
    pub total:      i64,
    pub page:       i64,
    pub limit:      i64,
}

// ── INTERNAL ROW TYPES ───────────────────────────────────────────────────────

/// Raw DB row struct used internally by the repository.
/// Not exposed to clients — gets converted to VendorResponse.
#[derive(Debug, Clone)]
pub struct VendorRow {
    pub id:                Uuid,
    pub user_id:           Uuid,
    pub business_name:     String,
    pub category:          String,
    pub bio:               Option<String>,
    pub location:          String,
    pub city:              String,
    pub serves_nationwide: bool,
    pub portfolio_urls:    Vec<String>,
    pub tier:              String,
    pub commission_rate:   Decimal,
    pub rating:            Decimal,
    pub bayesian_rating:   Decimal,
    pub review_count:      i32,
    pub hire_count:        i32,
    pub completion_rate:   Decimal,
    pub response_rate:     Decimal,
    pub is_verified:       bool,
    pub is_available:      bool,
    pub profile_views:     i32,
    pub last_active_at:    DateTime<Utc>,
    pub created_at:        DateTime<Utc>,
    pub updated_at:        DateTime<Utc>,
}

impl From<VendorRow> for VendorResponse {
    fn from(r: VendorRow) -> Self {
        VendorResponse {
            id:                r.id,
            user_id:           r.user_id,
            business_name:     r.business_name,
            category:          r.category,
            bio:               r.bio,
            location:          r.location,
            city:              r.city,
            serves_nationwide: r.serves_nationwide,
            portfolio_urls:    r.portfolio_urls,
            tier:              r.tier,
            commission_rate:   r.commission_rate,
            rating:            r.rating,
            bayesian_rating:   r.bayesian_rating,
            review_count:      r.review_count,
            hire_count:        r.hire_count,
            completion_rate:   r.completion_rate,
            response_rate:     r.response_rate,
            is_verified:       r.is_verified,
            is_available:      r.is_available,
            profile_views:     r.profile_views,
            created_at:        r.created_at,
        }
    }
}

/// Minimal event info needed for vendor matchmaking.
#[derive(Debug)]
pub struct EventForMatch {
    pub id:       Uuid,
    pub category: String,
    pub city:     String,          // Extracted from location
    pub date:     NaiveDate,
}
