-- ============================================================
-- Bukr: Run migrations 012 → 015 in one safe pass
-- Paste this entire file into Supabase SQL Editor and run.
-- Each block is idempotent — safe to re-run if something fails.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 012: Platform fees, revenue ledger, admin user type
-- ────────────────────────────────────────────────────────────

-- Expand user_type to include admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('user', 'organizer', 'admin'));

-- Add fee columns to payment_transactions (safe: IF NOT EXISTS via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'platform_fee'
  ) THEN
    ALTER TABLE payment_transactions
      ADD COLUMN platform_fee      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN bukrshield_fee    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN organizer_payout  DECIMAL(12,2) NOT NULL DEFAULT 0.00;
  END IF;
END $$;

-- Platform revenue ledger
CREATE TABLE IF NOT EXISTS platform_revenue (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  source       VARCHAR(40)  NOT NULL CHECK (source IN (
                 'ticket_fee',
                 'bukrshield_fee',
                 'vendor_commission',
                 'influencer_activation',
                 'scanner_addon',
                 'featured_listing',
                 'event_credit',
                 'vendor_verified',
                 'vendor_pro',
                 'gate_sale_activation',
                 'gate_sale_overage'
               )),
  reference_id UUID,
  organizer_id UUID         REFERENCES users(id) ON DELETE SET NULL,
  vendor_id    UUID,
  amount       DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  currency     VARCHAR(3)   NOT NULL DEFAULT 'NGN',
  meta         JSONB,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revenue_source         ON platform_revenue(source);
CREATE INDEX IF NOT EXISTS idx_revenue_organizer      ON platform_revenue(organizer_id);
CREATE INDEX IF NOT EXISTS idx_revenue_vendor         ON platform_revenue(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_revenue_created        ON platform_revenue(created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_created_source ON platform_revenue(created_at DESC, source);

-- ────────────────────────────────────────────────────────────
-- 013: Organizer credit packs + event monetisation columns
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizer_credit_packs (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_type      VARCHAR(20)  NOT NULL CHECK (pack_type IN (
                   'single', 'growth', 'pro_pack', 'annual'
                 )),
  credits_total  INTEGER      NOT NULL CHECK (credits_total > 0),
  credits_used   INTEGER      NOT NULL DEFAULT 0 CHECK (credits_used >= 0),
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

-- Add monetisation columns to events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'credit_pack_id'
  ) THEN
    ALTER TABLE events
      ADD COLUMN credit_pack_id        UUID         REFERENCES organizer_credit_packs(id),
      ADD COLUMN platform_fee_rate     DECIMAL(5,4) NOT NULL DEFAULT 0.02,
      ADD COLUMN featured_until        TIMESTAMPTZ,
      ADD COLUMN featured_paid         BOOLEAN      NOT NULL DEFAULT FALSE,
      ADD COLUMN scanner_enabled       BOOLEAN      NOT NULL DEFAULT FALSE,
      ADD COLUMN scanner_paid          BOOLEAN      NOT NULL DEFAULT FALSE,
      ADD COLUMN influencer_slots      INTEGER      NOT NULL DEFAULT 0,
      ADD COLUMN gate_sales_enabled    BOOLEAN      NOT NULL DEFAULT FALSE,
      ADD COLUMN gate_sales_paid       BOOLEAN      NOT NULL DEFAULT FALSE,
      ADD COLUMN gate_scan_count       INTEGER      NOT NULL DEFAULT 0,
      ADD COLUMN free_listing_fee_paid BOOLEAN      NOT NULL DEFAULT FALSE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_featured   ON events(featured_until) WHERE featured_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_gate_sales ON events(gate_sales_enabled) WHERE gate_sales_enabled = TRUE;

-- ────────────────────────────────────────────────────────────
-- 014: Full vendor marketplace system
-- ────────────────────────────────────────────────────────────

-- Expand user_type to include vendor
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('user', 'organizer', 'admin', 'vendor'));

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
  commission_rate         DECIMAL(4,3) NOT NULL DEFAULT 0.080,
  rating                  DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  bayesian_rating         DECIMAL(6,4) NOT NULL DEFAULT 0.00,
  review_count            INTEGER      NOT NULL DEFAULT 0,
  hire_count              INTEGER      NOT NULL DEFAULT 0,
  completion_rate         DECIMAL(4,3) NOT NULL DEFAULT 1.000,
  response_rate           DECIMAL(4,3) NOT NULL DEFAULT 1.000,
  is_verified             BOOLEAN      NOT NULL DEFAULT FALSE,
  is_available            BOOLEAN      NOT NULL DEFAULT TRUE,
  profile_views           INTEGER      NOT NULL DEFAULT 0,
  last_active_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
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
CREATE INDEX IF NOT EXISTS idx_vendors_search      ON vendors(category, city, is_available, bayesian_rating DESC);

CREATE TABLE IF NOT EXISTS vendor_availability (
  id        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID    NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  date      DATE    NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(vendor_id, date)
);
CREATE INDEX IF NOT EXISTS idx_vendor_avail      ON vendor_availability(vendor_id, date);
CREATE INDEX IF NOT EXISTS idx_vendor_avail_date ON vendor_availability(date, is_booked);

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
                      'pending', 'accepted', 'counter_offered',
                      'declined', 'completed', 'disputed'
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

-- Triggers for vendor tables
CREATE OR REPLACE FUNCTION recompute_vendor_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_avg    DECIMAL(5,2);
  v_count  INTEGER;
  m        CONSTANT DECIMAL := 5;
  c        CONSTANT DECIMAL := 3.5;
  b_rating DECIMAL(6,4);
BEGIN
  SELECT COALESCE(AVG(rating), 0)::DECIMAL(5,2), COUNT(*)::INTEGER
    INTO v_avg, v_count
    FROM vendor_reviews WHERE vendor_id = NEW.vendor_id;

  b_rating := ((v_count * v_avg + m * c) / (v_count + m));

  UPDATE vendors SET
    rating          = v_avg,
    review_count    = v_count,
    bayesian_rating = b_rating,
    is_verified     = (b_rating >= 4.5 AND v_count >= 5),
    updated_at      = NOW()
  WHERE id = NEW.vendor_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendor_rating ON vendor_reviews;
CREATE TRIGGER trg_vendor_rating
  AFTER INSERT ON vendor_reviews
  FOR EACH ROW EXECUTE FUNCTION recompute_vendor_rating();

CREATE OR REPLACE FUNCTION update_vendor_hire_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_accepted  INTEGER;
  v_completed INTEGER;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status IN ('accepted','counter_offered','completed','disputed')),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_accepted, v_completed
  FROM vendor_hires WHERE vendor_id = NEW.vendor_id;

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

DROP TRIGGER IF EXISTS trg_vendor_hire_stats ON vendor_hires;
CREATE TRIGGER trg_vendor_hire_stats
  AFTER UPDATE OF status ON vendor_hires
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_vendor_hire_stats();

DROP TRIGGER IF EXISTS trg_vendors_updated_at ON vendors;
CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_hires_updated_at ON vendor_hires;
CREATE TRIGGER trg_hires_updated_at
  BEFORE UPDATE ON vendor_hires
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 015: Influencer self-service portal
-- ────────────────────────────────────────────────────────────

-- Expand user_type to include influencer (final state)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('user', 'organizer', 'admin', 'vendor', 'influencer'));

-- Extend influencers table with portal fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'influencers' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE influencers
      ADD COLUMN user_id           UUID         REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN payout_account    JSONB,
      ADD COLUMN pending_earnings  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN total_withdrawn   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN invite_token      VARCHAR(64)   UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
      ADD COLUMN claimed_at        TIMESTAMPTZ;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_influencers_user  ON influencers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_influencers_token ON influencers(invite_token) WHERE invite_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS influencer_payouts (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID         NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  amount        DECIMAL(12,2) NOT NULL CHECK (amount >= 5000),
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  payment_ref   VARCHAR(255),
  admin_note    TEXT,
  requested_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMPTZ,
  paid_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payouts_influencer ON influencer_payouts(influencer_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status     ON influencer_payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_requested  ON influencer_payouts(requested_at DESC);

-- ────────────────────────────────────────────────────────────
-- Verification: confirm all 5 key tables exist
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  missing TEXT := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_revenue')     THEN missing := missing || ' platform_revenue'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizer_credit_packs') THEN missing := missing || ' organizer_credit_packs'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendors')              THEN missing := missing || ' vendors'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_hires')         THEN missing := missing || ' vendor_hires'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'influencer_payouts')   THEN missing := missing || ' influencer_payouts'; END IF;

  IF missing <> '' THEN
    RAISE EXCEPTION 'Migration incomplete — missing tables:%', missing;
  ELSE
    RAISE NOTICE '✓ All 5 migrations applied successfully. Tables verified.';
  END IF;
END $$;
