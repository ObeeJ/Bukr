/**
 * DOMAIN LAYER - Promo Code DTOs
 * 
 * Data structures for promo code operations
 * 
 * Architecture Layer: Domain (Layer 4)
 * Responsibility: Define data contracts for promo codes
 */

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// Request to create promo code
#[derive(Debug, Deserialize)]
pub struct CreatePromoRequest {
    pub code: String,                      // Promo code (e.g., "SUMMER2024")
    pub discount_percentage: Decimal,      // Discount (10.00 = 10%)
    pub ticket_limit: i32,                 // Max uses (0 = unlimited)
    pub expires_at: Option<DateTime<Utc>>, // Expiration date
}

// Request to update promo code (unused but defined for future)
#[derive(Debug, Deserialize)]
pub struct UpdatePromoRequest {
    pub code: Option<String>,
    pub discount_percentage: Option<Decimal>,
    pub ticket_limit: Option<i32>,
    pub is_active: Option<bool>,
    pub expires_at: Option<DateTime<Utc>>,
}

// Request to validate promo code
#[derive(Debug, Deserialize)]
pub struct ValidatePromoRequest {
    pub event_id: Uuid,    // Event to validate for
    pub code: String,      // Promo code to check
}

// Promo code response
#[derive(Debug, Serialize)]
pub struct PromoResponse {
    pub id: Uuid,
    pub event_id: Uuid,
    pub code: String,
    pub discount_percentage: Decimal,
    pub ticket_limit: i32,
    pub used_count: i32,               // How many times used
    pub is_active: bool,               // Enabled/disabled
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

// Promo validation result
#[derive(Debug, Serialize)]
pub struct ValidatePromoResponse {
    pub valid: bool,                       // Is code valid?
    pub discount_percentage: Decimal,      // Discount amount
    pub remaining_uses: Option<i32>,       // Uses left (None = unlimited)
}

// Database model for promo code
pub struct PromoCode {
    pub id: Uuid,
    pub event_id: Uuid,
    pub code: String,
    pub discount_percentage: Decimal,
    pub ticket_limit: i32,
    pub used_count: i32,
    pub is_active: bool,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
