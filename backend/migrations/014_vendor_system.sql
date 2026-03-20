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
