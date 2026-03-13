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
