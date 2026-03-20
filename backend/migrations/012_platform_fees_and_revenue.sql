-- Migration 012: Platform fee columns, revenue ledger, admin user type
-- Adds BukrShield + platform fee tracking to payment_transactions,
-- creates the platform_revenue cashbook, and adds 'admin' user type.

-- 1. Expand user_type to include admin (vendor + influencer added in 014/015)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('user', 'organizer', 'admin'));

-- 2. Add fee breakdown columns to payment_transactions
--    platform_fee    = 2% of ticket revenue (or ₦10 flat for < ₦500 tickets)
--    bukrshield_fee  = ₦100 per ticket (all paid events, deducted from organizer payout)
--    organizer_payout = total_price - platform_fee - bukrshield_fee
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS platform_fee      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS bukrshield_fee    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS organizer_payout  DECIMAL(12,2) NOT NULL DEFAULT 0.00;

-- 3. Platform revenue ledger: every naira Bukr earns, in one place
--    This powers admin financial analytics and prevents flying blind on revenue.
CREATE TABLE IF NOT EXISTS platform_revenue (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  source       VARCHAR(40)  NOT NULL CHECK (source IN (
                 'ticket_fee',           -- 2% platform fee on ticket sale
                 'bukrshield_fee',        -- ₦100/ticket fraud protection fee
                 'vendor_commission',     -- 5% or 8% on vendor hire completion
                 'influencer_activation', -- ₦300–500 per influencer slot
                 'scanner_addon',         -- ₦800 scanner for Starter events
                 'featured_listing',      -- ₦2,500 flat featured event listing
                 'event_credit',          -- Credit pack purchase (₦2k–₦25k)
                 'vendor_verified',       -- ₦2,000 vendor verification one-time
                 'vendor_pro',            -- ₦1,000/month Pro vendor subscription
                 'gate_sale_activation',  -- ₦3,000 gate sale mode per event
                 'gate_sale_overage'      -- ₦15/scan beyond 200 gate scans
               )),
  reference_id UUID,             -- ticket.id, vendor_hire.id, event.id, etc.
  organizer_id UUID         REFERENCES users(id) ON DELETE SET NULL,
  vendor_id    UUID,             -- set for vendor_commission rows
  amount       DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  currency     VARCHAR(3)   NOT NULL DEFAULT 'NGN',
  meta         JSONB,            -- flexible extra data (qty, rate, etc.)
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revenue_source    ON platform_revenue(source);
CREATE INDEX IF NOT EXISTS idx_revenue_organizer ON platform_revenue(organizer_id);
CREATE INDEX IF NOT EXISTS idx_revenue_vendor    ON platform_revenue(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_revenue_created   ON platform_revenue(created_at);
-- Composite for admin finance dashboard queries (date range + source)
CREATE INDEX IF NOT EXISTS idx_revenue_created_source ON platform_revenue(created_at DESC, source);
