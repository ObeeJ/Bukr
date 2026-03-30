// Fee engine — single source of truth for the frontend.
// Mirrors backend/core/src/fees.rs exactly.
// If Rust constants change, update ONLY this file.

const PAYSTACK_RATE = 0.015;
const PLATFORM_RATE = 0.02;
const DIVISOR = 1 - PAYSTACK_RATE - PLATFORM_RATE; // 0.965

function ceilTo(value: number, nearest: number): number {
  return Math.ceil(value / nearest) * nearest;
}

export interface FeeBreakdown {
  buyerPricePerTicket: number;
  buyerTotal: number;
  serviceFee: number;
  organizerPayout: number;
  feeMode: 'pass_to_buyer' | 'absorb';
}

// Compute buyer-facing fee breakdown.
// desiredPayoutPerTicket: what the organizer wants to receive per ticket
// feeMode: 'pass_to_buyer' = gross up buyer price, 'absorb' = fees from organizer payout
export function computeFees(
  desiredPayoutPerTicket: number,
  quantity: number,
  feeMode: 'pass_to_buyer' | 'absorb' = 'pass_to_buyer'
): FeeBreakdown {
  if (desiredPayoutPerTicket === 0) {
    return { buyerPricePerTicket: 0, buyerTotal: 0, serviceFee: 0, organizerPayout: 0, feeMode };
  }

  const shield = desiredPayoutPerTicket < 1000 ? 75 : 100;
  const roundTo = desiredPayoutPerTicket >= 10_000 ? 100 : 50;

  const buyerPricePerTicket = feeMode === 'pass_to_buyer'
    ? ceilTo((desiredPayoutPerTicket + shield) / DIVISOR, roundTo)
    : desiredPayoutPerTicket;

  const buyerTotal = buyerPricePerTicket * quantity;
  const platformFee = buyerTotal * PLATFORM_RATE;
  const bukrshieldFee = shield * quantity;
  const paystackFee = buyerTotal * PAYSTACK_RATE;
  const organizerPayout = buyerTotal - paystackFee - platformFee - bukrshieldFee;
  const serviceFee = buyerTotal - (feeMode === 'pass_to_buyer' ? desiredPayoutPerTicket * quantity : organizerPayout);

  return { buyerPricePerTicket, buyerTotal, serviceFee: Math.max(0, serviceFee), organizerPayout, feeMode };
}

export function formatPrice(n: number, symbol: string): string {
  return symbol + Math.round(n).toLocaleString();
}
