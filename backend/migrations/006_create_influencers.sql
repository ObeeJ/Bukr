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
