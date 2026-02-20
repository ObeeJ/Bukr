/**
 * DOMAIN LAYER - Data Transfer Objects
 * 
 * Ticket DTOs: The contracts between layers - what goes in, what comes out
 * 
 * Architecture Layer: Domain (Layer 4)
 * Dependencies: None (pure data structures)
 * Responsibility: Define the shape of data, enforce type safety, enable serialization
 * 
 * Why DTOs? Because internal models shouldn't leak to external APIs
 * Think of DTOs as the diplomatic translators between layers
 */

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// REQUEST DTOs - What comes IN from the client

/**
 * PurchaseTicketRequest: Everything needed to buy a ticket
 * 
 * This is what the frontend sends when someone clicks "Buy Now"
 * Validation happens in the service layer - DTOs are just dumb data carriers
 */
#[derive(Debug, Deserialize)]
pub struct PurchaseTicketRequest {
    pub event_id: Uuid,                      // Which event are we buying for?
    pub quantity: i32,                       // How many tickets? (1-10)
    pub ticket_type: Option<String>,         // VIP? General? Standing?
    pub promo_code: Option<String>,          // Got a discount code?
    pub excitement_rating: Option<i32>,      // How hyped are you? (1-5)
    pub payment_provider: String,            // "paystack" or "stripe"
    pub referral_code: Option<String>,       // Came from an influencer?
}

// RESPONSE DTOs - What goes OUT to the client

/**
 * TicketResponse: The ticket you just bought
 * 
 * Contains everything the user needs to know about their purchase
 * Includes event details so frontend doesn't need a second API call
 */
#[derive(Debug, Serialize)]
pub struct TicketResponse {
    pub id: Uuid,                            // Database ID (internal)
    pub ticket_id: String,                   // Human-readable ID (BUKR-1234-abc)
    pub event_id: Uuid,                      // Which event is this for?
    pub event_title: String,                 // Event name (denormalized for convenience)
    pub event_date: String,                  // When's the party?
    pub event_time: String,                  // What time?
    pub event_location: String,              // Where's the party?
    pub ticket_type: String,                 // What kind of ticket?
    pub quantity: i32,                       // How many tickets?
    pub unit_price: Decimal,                 // Price per ticket
    pub discount_applied: Decimal,           // Discount percentage (0-100)
    pub total_price: Decimal,                // Final price after discount
    pub currency: String,                    // NGN, USD, etc
    pub status: String,                      // valid, used, expired, cancelled
    pub qr_code_data: String,                // JSON payload for QR code
    pub purchase_date: DateTime<Utc>,        // When did you buy this?
}

/**
 * TicketWithEventResponse: Ticket with nested event info
 * 
 * Used when we want to show tickets with full event details
 * More structured than TicketResponse (nested vs flat)
 */
#[derive(Debug, Serialize)]
pub struct TicketWithEventResponse {
    pub id: Uuid,
    pub ticket_id: String,
    pub event: TicketEventInfo,              // Nested event details
    pub ticket_type: String,
    pub quantity: i32,
    pub total_price: Decimal,
    pub currency: String,
    pub status: String,
    pub qr_code_data: String,
    pub purchase_date: DateTime<Utc>,
}

/**
 * TicketEventInfo: Minimal event details for ticket display
 * 
 * Just enough info to show what event this ticket is for
 * Keeps response size small - we're not sending the whole event object
 */
#[derive(Debug, Serialize)]
pub struct TicketEventInfo {
    pub id: Uuid,
    pub title: String,
    pub date: String,
    pub time: String,
    pub location: String,
    pub emoji: Option<String>,               // Because events need personality
    pub event_key: String,                   // Short URL-friendly key
}

/**
 * PurchaseResponse: Complete purchase result
 * 
 * Returns both the ticket AND payment info
 * Client needs both to redirect user to payment gateway
 */
#[derive(Debug, Serialize)]
pub struct PurchaseResponse {
    pub ticket: TicketResponse,              // The ticket you're buying
    pub payment: PaymentInitResponse,        // Where to pay
}

/**
 * PaymentInitResponse: Payment gateway initialization data
 * 
 * Contains the URL to redirect user to Paystack/Stripe
 * Different providers have different field names - we normalize them
 */
#[derive(Debug, Serialize)]
pub struct PaymentInitResponse {
    pub provider: String,                    // "paystack" or "stripe"
    pub authorization_url: Option<String>,   // Paystack uses this
    pub checkout_url: Option<String>,        // Stripe uses this
    pub reference: String,                   // Unique payment reference
    pub amount: Decimal,                     // How much to pay
    pub currency: String,                    // In what currency
}

// INTERNAL MODEL - What lives in the database

/**
 * Ticket: The full internal representation
 * 
 * This is the database model - contains everything
 * Not exposed directly to API - we convert to response DTOs
 * 
 * Why separate? Because internal models change, APIs should be stable
 */
#[derive(Debug, Serialize)]
pub struct Ticket {
    pub id: Uuid,                            // Primary key
    pub ticket_id: String,                   // Human-readable ID
    pub event_id: Uuid,                      // Foreign key to events
    pub user_id: Uuid,                       // Foreign key to users
    pub ticket_type: String,                 // Type of ticket
    pub quantity: i32,                       // Number of tickets
    pub unit_price: Decimal,                 // Price per ticket
    pub total_price: Decimal,                // Total paid
    pub discount_applied: Decimal,           // Discount percentage
    pub promo_code_id: Option<Uuid>,         // Which promo was used?
    pub currency: String,                    // Currency code
    pub status: String,                      // Ticket status
    pub qr_code_data: String,                // QR code payload
    pub payment_ref: Option<String>,         // Payment reference
    pub payment_provider: Option<String>,    // Which provider
    pub excitement_rating: Option<i32>,      // User's hype level
    pub scanned_at: Option<DateTime<Utc>>,   // When was it scanned?
    pub purchase_date: DateTime<Utc>,        // When was it bought?
    pub created_at: DateTime<Utc>,           // Database timestamp
}
