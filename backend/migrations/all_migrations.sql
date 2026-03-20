-- 001_create_users.sql
-- Users table: linked to Supabase Auth via supabase_uid

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_uid    UUID UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    user_type       VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (user_type IN ('user', 'organizer')),
    org_name        VARCHAR(255),
    avatar_url      TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON users(supabase_uid);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
-- 002_create_events.sql

CREATE TABLE IF NOT EXISTS events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    date            DATE NOT NULL,
    time            TIME NOT NULL,
    end_date        DATE,
    location        VARCHAR(500) NOT NULL,
    price           DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'NGN',
    category        VARCHAR(100) NOT NULL,
    emoji           VARCHAR(10),
    event_key       VARCHAR(50) UNIQUE NOT NULL,
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'cancelled', 'completed')),
    total_tickets   INTEGER NOT NULL DEFAULT 0,
    available_tickets INTEGER NOT NULL DEFAULT 0,
    thumbnail_url   TEXT,
    video_url       TEXT,
    flier_url       TEXT,
    is_featured     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_event_key ON events(event_key);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
-- 003_create_promo_codes.sql
-- Must be created before tickets (tickets references promo_codes)

CREATE TABLE IF NOT EXISTS promo_codes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    code                VARCHAR(50) NOT NULL,
    discount_percentage DECIMAL(5, 2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
    ticket_limit        INTEGER NOT NULL DEFAULT 0,
    used_count          INTEGER DEFAULT 0,
    is_active           BOOLEAN DEFAULT TRUE,
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, code)
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_event ON promo_codes(event_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
-- 004_create_tickets.sql

CREATE TABLE IF NOT EXISTS tickets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       VARCHAR(50) UNIQUE NOT NULL,
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_type     VARCHAR(50) NOT NULL DEFAULT 'General Admission',
    quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 10),
    unit_price      DECIMAL(12, 2) NOT NULL,
    total_price     DECIMAL(12, 2) NOT NULL,
    discount_applied DECIMAL(5, 2) DEFAULT 0,
    promo_code_id   UUID REFERENCES promo_codes(id),
    currency        VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status          VARCHAR(20) DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'expired', 'cancelled', 'refunded')),
    qr_code_data    TEXT NOT NULL,
    payment_ref     VARCHAR(255),
    payment_provider VARCHAR(20),
    excitement_rating INTEGER CHECK (excitement_rating BETWEEN 1 AND 5),
    scanned_at      TIMESTAMPTZ,
    scanned_by      UUID REFERENCES users(id),
    purchase_date   TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_payment_ref ON tickets(payment_ref);
-- 005_create_favorites.sql

CREATE TABLE IF NOT EXISTS favorites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
-- 006_create_influencers.sql

CREATE TABLE IF NOT EXISTS influencers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    bio             TEXT,
    social_handle   VARCHAR(255),
    referral_code   VARCHAR(50) UNIQUE,
    referral_discount DECIMAL(5, 2) DEFAULT 10.00,
    total_referrals INTEGER DEFAULT 0,
    total_revenue   DECIMAL(12, 2) DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_influencers_organizer ON influencers(organizer_id);
CREATE INDEX IF NOT EXISTS idx_influencers_referral ON influencers(referral_code);
-- 007_create_scanner_and_logs.sql

CREATE TABLE IF NOT EXISTS scanner_access_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    code        VARCHAR(50) UNIQUE NOT NULL,
    label       VARCHAR(100),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    expires_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scanner_codes_event ON scanner_access_codes(event_id);

CREATE TABLE IF NOT EXISTS scan_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID NOT NULL REFERENCES tickets(id),
    event_id    UUID NOT NULL REFERENCES events(id),
    scanned_by  UUID REFERENCES users(id),
    access_code VARCHAR(50),
    result      VARCHAR(20) NOT NULL CHECK (result IN ('valid', 'invalid', 'already_used')),
    scanned_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_log_event ON scan_log(event_id);
CREATE INDEX IF NOT EXISTS idx_scan_log_ticket ON scan_log(ticket_id);
-- 008_create_payment_transactions.sql

CREATE TABLE IF NOT EXISTS payment_transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id           UUID REFERENCES tickets(id),
    user_id             UUID NOT NULL REFERENCES users(id),
    provider            VARCHAR(20) NOT NULL CHECK (provider IN ('paystack', 'stripe')),
    provider_ref        VARCHAR(255) UNIQUE NOT NULL,
    amount              DECIMAL(12, 2) NOT NULL,
    currency            VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status              VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    provider_response   JSONB,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_ref ON payment_transactions(provider_ref);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment_transactions(status);
-- 009_create_triggers.sql

-- Auto-decrement available tickets on purchase
CREATE OR REPLACE FUNCTION decrement_available_tickets()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE events
    SET available_tickets = available_tickets - NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.event_id
      AND available_tickets >= NEW.quantity;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Not enough tickets available';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decrement_tickets ON tickets;
CREATE TRIGGER trg_decrement_tickets
AFTER INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION decrement_available_tickets();

-- Auto-increment promo used_count on ticket purchase with promo
CREATE OR REPLACE FUNCTION increment_promo_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.promo_code_id IS NOT NULL THEN
        UPDATE promo_codes
        SET used_count = used_count + 1,
            updated_at = NOW()
        WHERE id = NEW.promo_code_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_promo ON tickets;
CREATE TRIGGER trg_increment_promo
AFTER INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION increment_promo_usage();

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON tickets;
CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_promo_codes_updated_at ON promo_codes;
CREATE TRIGGER trg_promo_codes_updated_at BEFORE UPDATE ON promo_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_influencers_updated_at ON influencers;
CREATE TRIGGER trg_influencers_updated_at BEFORE UPDATE ON influencers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payment_transactions;
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- 010_add_free_ticket_support.sql
-- Add explicit support for free tickets and scanner delegation

-- Add requires_payment flag to events
-- When FALSE, tickets can be claimed without payment
ALTER TABLE events
ADD COLUMN IF NOT EXISTS requires_payment BOOLEAN DEFAULT TRUE;

-- Add is_free flag to tickets
-- Distinguishes free tickets from paid tickets for analytics
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE;

-- Add scanner_assignments table for explicit scanner delegation
-- Organizers can assign specific users as scanners for their events
CREATE TABLE IF NOT EXISTS scanner_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    scanner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by     UUID NOT NULL REFERENCES users(id),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    UNIQUE(event_id, scanner_user_id)
);

CREATE INDEX IF NOT EXISTS idx_scanner_assignments_event ON scanner_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_scanner_assignments_scanner ON scanner_assignments(scanner_user_id);

-- Update existing tickets to mark free ones
UPDATE tickets SET is_free = TRUE WHERE unit_price = 0 OR total_price = 0;

-- Update existing events to set requires_payment based on price
UPDATE events SET requires_payment = FALSE WHERE price = 0;

COMMENT ON COLUMN events.requires_payment IS 'If FALSE, tickets can be claimed without payment';
COMMENT ON COLUMN tickets.is_free IS 'TRUE for free tickets, FALSE for paid tickets';
COMMENT ON TABLE scanner_assignments IS 'Organizers assign specific users as scanners for events';
-- 010_add_missing_indexes.sql
-- Performance optimization: add missing indexes for common query patterns

-- Reverse lookup: which users favorited a specific event
CREATE INDEX IF NOT EXISTS idx_favorites_event ON favorites(event_id);

-- Payment to ticket lookup (refunds, reconciliation)
CREATE INDEX IF NOT EXISTS idx_payments_ticket ON payment_transactions(ticket_id);

-- Scanner activity reports (who scanned what)
CREATE INDEX IF NOT EXISTS idx_tickets_scanned_by ON tickets(scanned_by);
-- 011_ticket_transfers_and_qr_nonce.sql
-- Ticket transfer system + QR nonce for anti-screenshot fraud

-- Add qr_nonce to tickets: rotates on every scan attempt, invalidating screenshots
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS qr_nonce VARCHAR(64);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS transferred_from UUID REFERENCES tickets(id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS original_user_id UUID REFERENCES users(id);

-- Populate nonce for existing tickets
UPDATE tickets SET qr_nonce = encode(gen_random_bytes(32), 'hex') WHERE qr_nonce IS NULL;

-- Make nonce NOT NULL after backfill
ALTER TABLE tickets ALTER COLUMN qr_nonce SET NOT NULL;
ALTER TABLE tickets ALTER COLUMN qr_nonce SET DEFAULT encode(gen_random_bytes(32), 'hex');

-- ticket_transfers: immutable audit log of every transfer
-- This is the source of truth — never deleted, never updated
CREATE TABLE IF NOT EXISTS ticket_transfers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       UUID NOT NULL REFERENCES tickets(id),
    from_user_id    UUID NOT NULL REFERENCES users(id),
    to_user_id      UUID NOT NULL REFERENCES users(id),
    to_email        VARCHAR(255) NOT NULL,
    -- Snapshot of ticket state at transfer time (forensic record)
    ticket_id_str   VARCHAR(50) NOT NULL,
    event_id        UUID NOT NULL REFERENCES events(id),
    transferred_at  TIMESTAMPTZ DEFAULT NOW(),
    -- Prevent double-transfer of same ticket in same second
    UNIQUE(ticket_id, transferred_at)
);

CREATE INDEX IF NOT EXISTS idx_transfers_ticket ON ticket_transfers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from_user ON ticket_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_user ON ticket_transfers(to_user_id);

-- Waitlist: users queue when event sells out
CREATE TABLE IF NOT EXISTS waitlist (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email       VARCHAR(255) NOT NULL,
    joined_at   TIMESTAMPTZ DEFAULT NOW(),
    notified_at TIMESTAMPTZ,
    status      VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'converted', 'expired')),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_event ON waitlist(event_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_user ON waitlist(user_id);

COMMENT ON COLUMN tickets.qr_nonce IS 'Rotates on every scan attempt. QR encodes nonce+ticketId+HMAC. Screenshots become invalid after first scan.';
COMMENT ON TABLE ticket_transfers IS 'Immutable audit log. Ownership mutation happens on tickets.user_id. This table is forensic evidence only.';
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
-- Migration 013: Organizer event credit packs + event monetisation columns
-- Credit model: organizers buy packs instead of subscriptions (event-infrequent friendly).
-- Credits valid for 12 months. Events on the free tier get basic listing only.

CREATE TABLE IF NOT EXISTS organizer_credit_packs (
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

CREATE INDEX IF NOT EXISTS idx_credits_organizer ON organizer_credit_packs(organizer_id);
CREATE INDEX IF NOT EXISTS idx_credits_active    ON organizer_credit_packs(organizer_id, is_active, expires_at);

-- Add monetisation and feature-gate columns to events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS credit_pack_id      UUID         REFERENCES organizer_credit_packs(id),
  ADD COLUMN IF NOT EXISTS platform_fee_rate   DECIMAL(5,4) NOT NULL DEFAULT 0.02,
  ADD COLUMN IF NOT EXISTS featured_until      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS featured_paid       BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS scanner_enabled     BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS scanner_paid        BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS influencer_slots    INTEGER      NOT NULL DEFAULT 0,
  -- Gate Sale Mode: organizer declares walk-in tickets will be sold at the door
  ADD COLUMN IF NOT EXISTS gate_sales_enabled  BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gate_sales_paid     BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gate_scan_count     INTEGER      NOT NULL DEFAULT 0,
  -- Free event listing fee tier (enforced server-side at event creation)
  ADD COLUMN IF NOT EXISTS free_listing_fee_paid BOOLEAN    NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_events_featured   ON events(featured_until) WHERE featured_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_gate_sales ON events(gate_sales_enabled) WHERE gate_sales_enabled = TRUE;
-- Migration 014: Full vendor marketplace system
-- Adds user_type = 'vendor', vendor profiles, availability calendar,
-- hire requests, reviews, invitations, and all supporting triggers.

-- 1. Expand user_type CHECK to include vendor (admin already added in 012)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('user', 'organizer', 'admin', 'vendor'));

-- 2. Vendor profiles
CREATE TABLE IF NOT EXISTS vendors (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name           VARCHAR(255) NOT NULL,
  category                VARCHAR(100) NOT NULL CHECK (category IN (
                            'DJ', 'Catering', 'Photography', 'Videography',
                            'MC', 'Decoration', 'Security', 'AV_Tech',
                            'Makeup', 'Ushers', 'Logistics', 'Other'
                          )),
  bio                     TEXT,
  location                VARCHAR(255) NOT NULL,
  city                    VARCHAR(100) NOT NULL,
  serves_nationwide       BOOLEAN      NOT NULL DEFAULT FALSE,
  portfolio_urls          TEXT[]       NOT NULL DEFAULT '{}',
  tier                    VARCHAR(20)  NOT NULL DEFAULT 'free'
                            CHECK (tier IN ('free', 'verified', 'pro')),
  -- Commission rates: free=8%, paid=5%
  commission_rate         DECIMAL(4,3) NOT NULL DEFAULT 0.080,
  -- Scoring fields (maintained by DB triggers)
  rating                  DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  bayesian_rating         DECIMAL(6,4) NOT NULL DEFAULT 0.00,
  review_count            INTEGER      NOT NULL DEFAULT 0,
  hire_count              INTEGER      NOT NULL DEFAULT 0,
  completion_rate         DECIMAL(4,3) NOT NULL DEFAULT 1.000,
  response_rate           DECIMAL(4,3) NOT NULL DEFAULT 1.000,
  -- Verification: auto-set by trigger when bayesian_rating >= 4.5 with ≥5 reviews
  is_verified             BOOLEAN      NOT NULL DEFAULT FALSE,
  is_available            BOOLEAN      NOT NULL DEFAULT TRUE,
  -- Profile analytics
  profile_views           INTEGER      NOT NULL DEFAULT 0,
  last_active_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- Subscription tracking
  verification_paid_at    TIMESTAMPTZ,
  pro_trial_ends_at       TIMESTAMPTZ  DEFAULT (NOW() + INTERVAL '14 days'),
  subscription_expires_at TIMESTAMPTZ,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_city        ON vendors(city);
CREATE INDEX IF NOT EXISTS idx_vendors_category    ON vendors(category);
CREATE INDEX IF NOT EXISTS idx_vendors_tier        ON vendors(tier);
CREATE INDEX IF NOT EXISTS idx_vendors_bay_rating  ON vendors(bayesian_rating DESC);
CREATE INDEX IF NOT EXISTS idx_vendors_verified    ON vendors(is_verified);
CREATE INDEX IF NOT EXISTS idx_vendors_available   ON vendors(is_available);
CREATE INDEX IF NOT EXISTS idx_vendors_nationwide  ON vendors(serves_nationwide) WHERE serves_nationwide = TRUE;
-- Composite for marketplace search: category + city + availability + score
CREATE INDEX IF NOT EXISTS idx_vendors_search ON vendors(category, city, is_available, bayesian_rating DESC);

-- 3. Vendor availability calendar
CREATE TABLE IF NOT EXISTS vendor_availability (
  id        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID    NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  date      DATE    NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(vendor_id, date)
);
CREATE INDEX IF NOT EXISTS idx_vendor_avail ON vendor_availability(vendor_id, date);
CREATE INDEX IF NOT EXISTS idx_vendor_avail_date ON vendor_availability(date, is_booked);

-- 4. Vendor hire requests
CREATE TABLE IF NOT EXISTS vendor_hires (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID         NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  vendor_id       UUID         NOT NULL REFERENCES vendors(id),
  organizer_id    UUID         NOT NULL REFERENCES users(id),
  proposed_amount DECIMAL(12,2),
  agreed_amount   DECIMAL(12,2),
  bukr_commission DECIMAL(12,2),
  commission_rate DECIMAL(4,3) NOT NULL DEFAULT 0.050,
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                      'pending',        -- organizer sent request, vendor hasn't responded
                      'accepted',       -- vendor accepted organizer's proposed amount
                      'counter_offered',-- vendor countered with different amount
                      'declined',       -- vendor declined
                      'completed',      -- organizer confirmed event happened, triggers payout
                      'disputed'        -- under review
                    )),
  message         TEXT,
  counter_amount  DECIMAL(12,2),
  payment_ref     VARCHAR(255),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hires_event     ON vendor_hires(event_id);
CREATE INDEX IF NOT EXISTS idx_hires_vendor    ON vendor_hires(vendor_id);
CREATE INDEX IF NOT EXISTS idx_hires_organizer ON vendor_hires(organizer_id);
CREATE INDEX IF NOT EXISTS idx_hires_status    ON vendor_hires(status);

-- 5. Vendor reviews (one per hire)
CREATE TABLE IF NOT EXISTS vendor_reviews (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   UUID    NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  reviewer_id UUID    NOT NULL REFERENCES users(id),
  hire_id     UUID    NOT NULL REFERENCES vendor_hires(id),
  event_id    UUID    REFERENCES events(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vendor_id, hire_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_vendor ON vendor_reviews(vendor_id);

-- 6. Vendor invitations (organizer invites external vendor not yet on platform)
CREATE TABLE IF NOT EXISTS vendor_invitations (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID         NOT NULL REFERENCES users(id),
  event_id     UUID         REFERENCES events(id),
  email        VARCHAR(255) NOT NULL,
  token        VARCHAR(64)  UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'registered', 'expired')),
  sent_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE(organizer_id, email, event_id)
);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON vendor_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON vendor_invitations(email);

-- 7. Triggers

-- Auto-update updated_at for vendors and vendor_hires
CREATE OR REPLACE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_hires_updated_at
  BEFORE UPDATE ON vendor_hires
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Recompute bayesian rating + is_verified after each new review
-- Bayesian formula: (count * avg + prior_count * prior) / (count + prior_count)
-- prior_count = 5 reviews, prior = 3.5 (neutral)
CREATE OR REPLACE FUNCTION recompute_vendor_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_avg    DECIMAL(5,2);
  v_count  INTEGER;
  m        CONSTANT DECIMAL := 5;    -- minimum reviews threshold for confidence
  c        CONSTANT DECIMAL := 3.5;  -- global prior mean (neutral quality)
  b_rating DECIMAL(6,4);
BEGIN
  SELECT COALESCE(AVG(rating), 0)::DECIMAL(5,2),
         COUNT(*)::INTEGER
    INTO v_avg, v_count
    FROM vendor_reviews
    WHERE vendor_id = NEW.vendor_id;

  -- Bayesian average: weights raw avg toward prior when review count is low
  b_rating := ((v_count * v_avg + m * c) / (v_count + m));

  UPDATE vendors SET
    rating          = v_avg,
    review_count    = v_count,
    bayesian_rating = b_rating,
    -- Auto-verify: bayesian_rating >= 4.5 AND at least 5 reviews
    is_verified     = (b_rating >= 4.5 AND v_count >= 5),
    updated_at      = NOW()
  WHERE id = NEW.vendor_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_vendor_rating
  AFTER INSERT ON vendor_reviews
  FOR EACH ROW EXECUTE FUNCTION recompute_vendor_rating();

-- Update vendor completion_rate and hire_count when hire status changes
CREATE OR REPLACE FUNCTION update_vendor_hire_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_accepted  INTEGER;
  v_completed INTEGER;
BEGIN
  -- Count hires that moved past pending (accepted, counter_offered, completed, disputed)
  SELECT
    COUNT(*) FILTER (WHERE status IN ('accepted','counter_offered','completed','disputed')),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_accepted, v_completed
  FROM vendor_hires
  WHERE vendor_id = NEW.vendor_id;

  UPDATE vendors SET
    hire_count      = v_accepted,
    completion_rate = CASE
                        WHEN v_accepted = 0 THEN 1.000
                        ELSE ROUND((v_completed::DECIMAL / v_accepted), 3)
                      END,
    updated_at      = NOW()
  WHERE id = NEW.vendor_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_vendor_hire_stats
  AFTER UPDATE OF status ON vendor_hires
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_vendor_hire_stats();
-- Migration 015: Influencer self-service portal
-- Adds user_type = 'influencer', links organizer-created influencer records
-- to Bukr user accounts, adds payout account storage, and creates the
-- influencer_payouts table for payout request tracking.

-- 1. Expand user_type to include influencer
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('user', 'organizer', 'admin', 'vendor', 'influencer'));

-- 2. Extend influencers table with portal fields
--    user_id is nullable: organizer-created influencers may not have Bukr accounts yet.
--    When an influencer claims their account via invite_token, user_id gets set.
ALTER TABLE influencers
  ADD COLUMN IF NOT EXISTS user_id           UUID         REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payout_account    JSONB,
  -- payout_account shape: { bank_code, account_number, account_name, bank_name }
  ADD COLUMN IF NOT EXISTS pending_earnings  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_withdrawn   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  -- invite_token: sent to influencer's email so they can claim their portal account
  ADD COLUMN IF NOT EXISTS invite_token      VARCHAR(64)   UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  ADD COLUMN IF NOT EXISTS claimed_at        TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_influencers_user  ON influencers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_influencers_token ON influencers(invite_token) WHERE invite_token IS NOT NULL;

-- 3. Influencer payout requests
--    Minimum payout: ₦5,000. Admin approves/rejects manually for now.
CREATE TABLE IF NOT EXISTS influencer_payouts (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID         NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  amount        DECIMAL(12,2) NOT NULL CHECK (amount >= 5000),
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending'
                  CHECK (status IN (
                    'pending',    -- awaiting admin approval
                    'processing', -- admin approved, transfer in flight
                    'paid',       -- funds sent
                    'failed'      -- transfer failed, amount returned to pending_earnings
                  )),
  payment_ref   VARCHAR(255),
  admin_note    TEXT,           -- optional note from admin on approval/rejection
  requested_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMPTZ,
  paid_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payouts_influencer ON influencer_payouts(influencer_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status     ON influencer_payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_requested  ON influencer_payouts(requested_at DESC);
-- Migration 016: Add event_type and city to events
--
-- event_type: physical | online | hybrid
--   - physical: venue-based, location required, vendor matchmaking uses city
--   - online:   no venue, location holds a URL or "Online", city = 'Online'
--   - hybrid:   both a venue and a stream link
--
-- city: extracted city name for vendor matchmaking and distance features.
--   Previously the Rust service split location on ',' which was fragile.
--   Now city is a first-class indexed column, same pattern as vendors.city.

-- 1. Add event_type with safe default (all existing events are physical)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(20) NOT NULL DEFAULT 'physical'
    CHECK (event_type IN ('physical', 'online', 'hybrid'));

-- 2. Add city column — nullable initially so backfill can run first
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- 3. Backfill city from existing location strings.
--    Strategy: take the last comma-separated segment, trimmed.
--    "Eko Hotel, Victoria Island, Lagos" → "Lagos"
--    "National Theatre, Lagos"           → "Lagos"
--    "Abuja International Conference"    → full string (no comma)
--    Online events will be set to 'Online' after event_type backfill.
UPDATE events
SET city = TRIM(SPLIT_PART(location, ',', ARRAY_LENGTH(STRING_TO_ARRAY(location, ','), 1)))
WHERE city IS NULL;

-- 4. Online events get city = 'Online' (no physical location)
UPDATE events SET city = 'Online' WHERE event_type = 'online' AND city IS NULL;

-- 5. Enforce NOT NULL now that backfill is complete
ALTER TABLE events ALTER COLUMN city SET NOT NULL;
ALTER TABLE events ALTER COLUMN city SET DEFAULT '';

-- 6. Indexes — city is used in vendor matchmaking and future distance queries
CREATE INDEX IF NOT EXISTS idx_events_city       ON events(city);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
-- Composite for context-aware discovery: city + type + date + status
CREATE INDEX IF NOT EXISTS idx_events_discovery
  ON events(city, event_type, date, status)
  WHERE status = 'active';

COMMENT ON COLUMN events.event_type IS 'physical | online | hybrid. Controls vendor matching, distance display, and calendar link behaviour.';
COMMENT ON COLUMN events.city IS 'Extracted city name. Indexed for vendor matchmaking and distance features. Set to ''Online'' for online events.';
-- Migration 017: Event coordinates, online link, and integrity constraints
--
-- latitude / longitude: stored as DECIMAL(9,6) — sufficient for ~0.1m precision globally.
--   Used by the distance feature and future map rendering.
--   Nullable: physical events may not have coordinates yet (backfill via geocoding job).
--
-- online_link: the Zoom / Google Meet / YouTube Live URL for online and hybrid events.
--   Nullable at the DB level; enforced NOT NULL for online/hybrid via CHECK constraint.
--
-- Constraint logic:
--   online and hybrid events MUST have an online_link.
--   physical events MUST NOT have coordinates = NULL if they want distance features
--   (we can't enforce that here without geocoding, so we leave it nullable).

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS latitude   DECIMAL(9,6),
  ADD COLUMN IF NOT EXISTS longitude  DECIMAL(9,6),
  ADD COLUMN IF NOT EXISTS online_link TEXT;

-- Enforce: online and hybrid events must supply a link.
-- This fires at INSERT and UPDATE time — organizer cannot publish without it.
ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_online_link_required;
ALTER TABLE events ADD CONSTRAINT chk_online_link_required CHECK (
  event_type = 'physical'
  OR (event_type IN ('online', 'hybrid') AND online_link IS NOT NULL AND online_link <> '')
);

-- Enforce: coordinates must be in valid range if provided.
ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_coordinates_range;
ALTER TABLE events ADD CONSTRAINT chk_coordinates_range CHECK (
  (latitude  IS NULL OR latitude  BETWEEN -90  AND  90)
  AND
  (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);

-- Spatial index: used for future "events near me" queries.
-- A partial index on non-null coordinates keeps it lean.
CREATE INDEX IF NOT EXISTS idx_events_coordinates
  ON events(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMENT ON COLUMN events.latitude    IS 'WGS84 latitude. Populated by geocoding job or organizer input. Required for distance feature.';
COMMENT ON COLUMN events.longitude   IS 'WGS84 longitude. Populated by geocoding job or organizer input. Required for distance feature.';
COMMENT ON COLUMN events.online_link IS 'Zoom / Meet / YouTube URL. Required for online and hybrid events (enforced by chk_online_link_required).';
