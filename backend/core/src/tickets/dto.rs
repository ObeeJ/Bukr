use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// --- Request DTOs ---

#[derive(Debug, Deserialize)]
pub struct PurchaseTicketRequest {
    pub event_id: Uuid,
    pub quantity: i32,
    pub ticket_type: Option<String>,
    pub promo_code: Option<String>,
    pub excitement_rating: Option<i32>,
    pub payment_provider: String, // "paystack" | "stripe"
    pub referral_code: Option<String>,
}

// --- Response DTOs ---

#[derive(Debug, Serialize)]
pub struct TicketResponse {
    pub id: Uuid,
    pub ticket_id: String,
    pub event_id: Uuid,
    pub event_title: String,
    pub event_date: String,
    pub event_time: String,
    pub event_location: String,
    pub ticket_type: String,
    pub quantity: i32,
    pub unit_price: Decimal,
    pub discount_applied: Decimal,
    pub total_price: Decimal,
    pub currency: String,
    pub status: String,
    pub qr_code_data: String,
    pub purchase_date: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct TicketWithEventResponse {
    pub id: Uuid,
    pub ticket_id: String,
    pub event: TicketEventInfo,
    pub ticket_type: String,
    pub quantity: i32,
    pub total_price: Decimal,
    pub currency: String,
    pub status: String,
    pub qr_code_data: String,
    pub purchase_date: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct TicketEventInfo {
    pub id: Uuid,
    pub title: String,
    pub date: String,
    pub time: String,
    pub location: String,
    pub emoji: Option<String>,
    pub event_key: String,
}

#[derive(Debug, Serialize)]
pub struct PurchaseResponse {
    pub ticket: TicketResponse,
    pub payment: PaymentInitResponse,
}

#[derive(Debug, Serialize)]
pub struct PaymentInitResponse {
    pub provider: String,
    pub authorization_url: Option<String>,
    pub checkout_url: Option<String>,
    pub reference: String,
    pub amount: Decimal,
    pub currency: String,
}

// --- Internal model ---

#[derive(Debug, Serialize)]
pub struct Ticket {
    pub id: Uuid,
    pub ticket_id: String,
    pub event_id: Uuid,
    pub user_id: Uuid,
    pub ticket_type: String,
    pub quantity: i32,
    pub unit_price: Decimal,
    pub total_price: Decimal,
    pub discount_applied: Decimal,
    pub promo_code_id: Option<Uuid>,
    pub currency: String,
    pub status: String,
    pub qr_code_data: String,
    pub payment_ref: Option<String>,
    pub payment_provider: Option<String>,
    pub excitement_rating: Option<i32>,
    pub scanned_at: Option<DateTime<Utc>>,
    pub purchase_date: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}
