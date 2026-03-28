-- Migration 020: waitlist + user feedback
-- Both tables are append-only. No PII beyond email in waitlist.

CREATE TABLE IF NOT EXISTS waitlist (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT waitlist_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist (created_at DESC);

CREATE TABLE IF NOT EXISTS user_feedback (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    user_type   TEXT NOT NULL CHECK (user_type IN ('user', 'organizer', 'vendor', 'influencer', 'scanner')),
    journey     TEXT NOT NULL CHECK (journey IN ('ticket_purchased', 'event_created', 'vendor_registered', 'payout_requested', 'scan_session_ended')),
    recommend   BOOLEAN NOT NULL,
    rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT CHECK (char_length(comment) <= 120),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_type  ON user_feedback (user_type);
CREATE INDEX IF NOT EXISTS idx_feedback_journey    ON user_feedback (journey);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON user_feedback (created_at DESC);
