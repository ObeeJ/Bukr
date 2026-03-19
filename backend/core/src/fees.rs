/// Unified Bukr fee engine.
///
/// Single source of truth — imported by both tickets/service.rs and payments/service.rs.
/// Any fee change happens here and propagates everywhere automatically.
///
/// Model: Hybrid Smart Pricing
///   - PASS_TO_BUYER (default): organizer sets desired payout, system grosses up buyer price
///   - ABSORB: organizer sets ticket price directly, fees deducted from their payout
///
/// Tiers (verified against spreadsheet):
///   Free (₦0):          no fees
///   Low  (₦500–₦999):   ₦75 flat shield + 2% platform, round to ₦50
///   Std  (₦1k–₦9,999):  ₦100 flat shield + 2% platform, round to ₦50
///   Prem (₦10k+):       ₦100 flat shield + 2% platform, round to ₦100
///
/// Paystack 1.5% always comes off the gross — never absorbed by Bukr.

use rust_decimal::Decimal;
use rust_decimal::prelude::FromPrimitive;
use serde::{Deserialize, Serialize};

const PAYSTACK_RATE: f64 = 0.015;
const PLATFORM_RATE: f64 = 0.02;
const COMBINED_RATE: f64 = PAYSTACK_RATE + PLATFORM_RATE; // 0.035
const DIVISOR: f64 = 1.0 - COMBINED_RATE;                 // 0.965

const SHIELD_LOW: i64 = 75;   // ₦75 for ₦500–₦999 tickets
const SHIELD_STD: i64 = 100;  // ₦100 for ₦1,000+ tickets
const MIN_PAID: i64 = 500;    // minimum paid ticket price

/// Fee mode stored on the event — set by organizer at event creation.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FeeMode {
    PassToBuyer, // default: buyer pays grossed-up price
    Absorb,      // organizer absorbs Bukr fees (not Paystack)
}

impl Default for FeeMode {
    fn default() -> Self {
        FeeMode::PassToBuyer
    }
}

/// Complete fee breakdown for one purchase.
#[derive(Debug, Clone, Serialize)]
pub struct FeeBreakdown {
    /// What the buyer actually pays (per ticket × quantity)
    pub buyer_price_per_ticket: Decimal,
    /// Total buyer pays for all tickets
    pub buyer_total: Decimal,
    /// Bukr's 2% platform fee on the total
    pub platform_fee: Decimal,
    /// BukrShield flat fee (₦75 or ₦100 × quantity)
    pub bukrshield_fee: Decimal,
    /// What Paystack takes (1.5% of buyer_total) — informational only
    pub paystack_fee: Decimal,
    /// What the organizer actually receives
    pub organizer_payout: Decimal,
    /// Bukr's net profit (platform_fee + bukrshield_fee)
    pub bukr_net: Decimal,
}

/// Compute the full fee breakdown for a ticket purchase.
///
/// `desired_payout_per_ticket` is:
///   - PassToBuyer mode: what the organizer wants to receive per ticket
///   - Absorb mode:      the ticket price the organizer set (buyer pays this)
///
/// `quantity` is the number of tickets being purchased.
pub fn compute_fees(
    desired_payout_per_ticket: Decimal,
    quantity: i32,
    fee_mode: &FeeMode,
) -> FeeBreakdown {
    let qty = Decimal::from(quantity);
    let zero = Decimal::ZERO;

    // Free event — no fees at all
    if desired_payout_per_ticket == zero {
        return FeeBreakdown {
            buyer_price_per_ticket: zero,
            buyer_total: zero,
            platform_fee: zero,
            bukrshield_fee: zero,
            paystack_fee: zero,
            organizer_payout: zero,
            bukr_net: zero,
        };
    }

    // Determine shield flat fee based on ticket price tier
    let payout_i64 = desired_payout_per_ticket
        .to_string()
        .parse::<f64>()
        .unwrap_or(0.0) as i64;

    let shield_per_ticket = if payout_i64 < 1000 {
        Decimal::from(SHIELD_LOW)
    } else {
        Decimal::from(SHIELD_STD)
    };

    // Rounding increment: ₦50 under ₦10k, ₦100 at ₦10k+
    let round_to: f64 = if payout_i64 >= 10_000 { 100.0 } else { 50.0 };

    let buyer_price_per_ticket = match fee_mode {
        FeeMode::PassToBuyer => {
            // Gross-up formula: CEILING((payout + shield) / 0.965, round_to)
            let shield_f64 = shield_per_ticket
                .to_string()
                .parse::<f64>()
                .unwrap_or(100.0);
            let payout_f64 = desired_payout_per_ticket
                .to_string()
                .parse::<f64>()
                .unwrap_or(0.0);
            let exact = (payout_f64 + shield_f64) / DIVISOR;
            let rounded = (exact / round_to).ceil() * round_to;
            Decimal::from_f64(rounded).unwrap_or(desired_payout_per_ticket)
        }
        FeeMode::Absorb => {
            // Organizer sets the price directly — buyer pays this
            desired_payout_per_ticket
        }
    };

    let buyer_total = buyer_price_per_ticket * qty;

    // Platform fee: 2% of buyer total
    let platform_fee = buyer_total * Decimal::from_f64(PLATFORM_RATE).unwrap();

    // BukrShield: flat per ticket
    let bukrshield_fee = shield_per_ticket * qty;

    // Paystack: 1.5% of buyer total (informational — comes off gross automatically)
    let paystack_fee = buyer_total * Decimal::from_f64(PAYSTACK_RATE).unwrap();

    // Organizer payout: buyer_total minus all deductions
    let organizer_payout = buyer_total - paystack_fee - platform_fee - bukrshield_fee;

    let bukr_net = platform_fee + bukrshield_fee;

    FeeBreakdown {
        buyer_price_per_ticket,
        buyer_total,
        platform_fee,
        bukrshield_fee,
        paystack_fee,
        organizer_payout,
        bukr_net,
    }
}

/// Validate that a paid ticket price meets the ₦500 minimum.
/// Returns Err with a user-friendly message if below minimum.
pub fn validate_min_price(unit_price: Decimal) -> Result<(), String> {
    let min = Decimal::from(MIN_PAID);
    if unit_price > Decimal::ZERO && unit_price < min {
        return Err(format!(
            "Minimum ticket price is ₦{}. Free events must be set to ₦0.",
            MIN_PAID
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn free_event_zero_fees() {
        let b = compute_fees(dec!(0), 1, &FeeMode::PassToBuyer);
        assert_eq!(b.buyer_total, dec!(0));
        assert_eq!(b.bukr_net, dec!(0));
    }

    #[test]
    fn pass_to_buyer_5000_rounds_to_5300() {
        let b = compute_fees(dec!(5000), 1, &FeeMode::PassToBuyer);
        // Spreadsheet verified: ₦5,000 payout → ₦5,300 buyer price
        assert_eq!(b.buyer_price_per_ticket, dec!(5300));
    }

    #[test]
    fn pass_to_buyer_500_rounds_to_600() {
        let b = compute_fees(dec!(500), 1, &FeeMode::PassToBuyer);
        // ₦500 payout + ₦75 shield / 0.965 = ₦596 → ceil to ₦600
        assert_eq!(b.buyer_price_per_ticket, dec!(600));
    }

    #[test]
    fn pass_to_buyer_20000_rounds_to_100() {
        let b = compute_fees(dec!(20000), 1, &FeeMode::PassToBuyer);
        // Premium tier: rounds to nearest ₦100
        let price_f64: f64 = b.buyer_price_per_ticket.to_string().parse().unwrap();
        assert_eq!(price_f64 % 100.0, 0.0, "Premium ticket must round to ₦100");
    }

    #[test]
    fn absorb_mode_buyer_pays_listed_price() {
        let b = compute_fees(dec!(5000), 1, &FeeMode::Absorb);
        assert_eq!(b.buyer_price_per_ticket, dec!(5000));
        assert_eq!(b.buyer_total, dec!(5000));
    }

    #[test]
    fn min_price_validation_rejects_below_500() {
        assert!(validate_min_price(dec!(200)).is_err());
        assert!(validate_min_price(dec!(499)).is_err());
        assert!(validate_min_price(dec!(500)).is_ok());
        assert!(validate_min_price(dec!(0)).is_ok()); // free events allowed
    }

    #[test]
    fn quantity_scales_correctly() {
        let single = compute_fees(dec!(5000), 1, &FeeMode::PassToBuyer);
        let double = compute_fees(dec!(5000), 2, &FeeMode::PassToBuyer);
        assert_eq!(double.buyer_total, single.buyer_total * dec!(2));
        assert_eq!(double.bukrshield_fee, single.bukrshield_fee * dec!(2));
    }
}
