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
