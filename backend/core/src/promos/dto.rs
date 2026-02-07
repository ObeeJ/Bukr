use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreatePromoRequest {
    pub code: String,
    pub discount_percentage: Decimal,
    pub ticket_limit: i32,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePromoRequest {
    pub code: Option<String>,
    pub discount_percentage: Option<Decimal>,
    pub ticket_limit: Option<i32>,
    pub is_active: Option<bool>,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct ValidatePromoRequest {
    pub event_id: Uuid,
    pub code: String,
}

#[derive(Debug, Serialize)]
pub struct PromoResponse {
    pub id: Uuid,
    pub event_id: Uuid,
    pub code: String,
    pub discount_percentage: Decimal,
    pub ticket_limit: i32,
    pub used_count: i32,
    pub is_active: bool,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ValidatePromoResponse {
    pub valid: bool,
    pub discount_percentage: Decimal,
    pub remaining_uses: Option<i32>,
}

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
