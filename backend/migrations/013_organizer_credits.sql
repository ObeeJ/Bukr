-- Migration 013: Organizer event credit packs + event monetisation columns
-- Credit model: organizers buy packs instead of subscriptions (event-infrequent friendly).
-- Credits valid for 12 months. Events on the free tier get basic listing only.

CREATE TABLE organizer_credit_packs (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_type      VARCHAR(20)  NOT NULL CHECK (pack_type IN (
                   'single',        -- ₦2,000 · 1 event credit
                   'growth',        -- ₦5,000 · 3 event credits
                   'pro_pack',      -- ₦12,000 · 10 events + 1 featured listing
                   'annual'         -- ₦25,000 · unlimited/yr + 3 featured listings
                 )),
  credits_total  INTEGER      NOT NULL CHECK (credits_total > 0),
  credits_used   INTEGER      NOT NULL DEFAULT 0 CHECK (credits_used >= 0),
  -- featured_listings_total/used: only relevant for pro_pack and annual
  featured_total INTEGER      NOT NULL DEFAULT 0,
  featured_used  INTEGER      NOT NULL DEFAULT 0,
  price_paid     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_ref    VARCHAR(255),
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  purchased_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '12 months'),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credits_organizer ON organizer_credit_packs(organizer_id);
CREATE INDEX idx_credits_active    ON organizer_credit_packs(organizer_id, is_active, expires_at);

-- Add monetisation and feature-gate columns to events
ALTER TABLE events
  ADD COLUMN credit_pack_id      UUID         REFERENCES organizer_credit_packs(id),
  ADD COLUMN platform_fee_rate   DECIMAL(5,4) NOT NULL DEFAULT 0.02,
  ADD COLUMN featured_until      TIMESTAMPTZ,
  ADD COLUMN featured_paid       BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN scanner_enabled     BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN scanner_paid        BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN influencer_slots    INTEGER      NOT NULL DEFAULT 0,
  -- Gate Sale Mode: organizer declares walk-in tickets will be sold at the door
  ADD COLUMN gate_sales_enabled  BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN gate_sales_paid     BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN gate_scan_count     INTEGER      NOT NULL DEFAULT 0,
  -- Free event listing fee tier (enforced server-side at event creation)
  ADD COLUMN free_listing_fee_paid BOOLEAN    NOT NULL DEFAULT FALSE;

CREATE INDEX idx_events_featured   ON events(featured_until) WHERE featured_until IS NOT NULL;
CREATE INDEX idx_events_gate_sales ON events(gate_sales_enabled) WHERE gate_sales_enabled = TRUE;
