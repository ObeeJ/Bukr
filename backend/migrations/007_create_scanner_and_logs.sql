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
