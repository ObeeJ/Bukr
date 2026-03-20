-- Migration 018: Multi-use, Time-bound Tickets, and Wallets
-- 
-- Adds support for:
-- 1. Multi-use tickets (e.g., "4 PS5 sessions")
-- 2. Time-bound tickets (e.g., "valid for 2 hours after first scan")
-- 3. Niche-specific event categorization
-- 4. User and Organizer wallet abstraction

-- 1. Enhance events table for niche and behavior
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS niche_type VARCHAR(50) DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS is_time_bound BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER, -- If time-bound
  ADD COLUMN IF NOT EXISTS is_multi_use BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS max_usage INTEGER DEFAULT 1;

-- 2. Enhance tickets table for tracking usage and rotation
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS usage_limit INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qr_nonce VARCHAR(255), -- For rotating QR logic
  ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ;

-- Constraint: usage_count cannot exceed usage_limit
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS chk_usage_limit;
ALTER TABLE tickets ADD CONSTRAINT chk_usage_limit CHECK (usage_count <= usage_limit);

-- 3. Wallet and Balance Layer
CREATE TABLE IF NOT EXISTS wallets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance         DECIMAL(15, 2) NOT NULL DEFAULT 0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'locked', 'suspended')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id       UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    amount          DECIMAL(15, 2) NOT NULL,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'payment', 'payout', 'refund')),
    reference       VARCHAR(255) UNIQUE,
    description     TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);

-- 4. New Scan Logs for Granular Tracking
CREATE TABLE IF NOT EXISTS ticket_scan_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    scanned_by      UUID NOT NULL REFERENCES users(id),
    device_id       VARCHAR(255),
    latitude        DECIMAL(9,6),
    longitude       DECIMAL(9,6),
    status          VARCHAR(20) NOT NULL, -- 'success', 'failed', 'fraud_detected', 'expired'
    reason          TEXT, -- e.g., 'Insufficient usage left'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_logs_ticket ON ticket_scan_logs(ticket_id);
