-- Migration 022: In-app notifications and notification preferences
--
-- ticket_notifications already exists (created by Rust core migrations).
-- We add the missing is_read and message columns needed by the HTTP handler.
-- notification_preferences is new.

ALTER TABLE ticket_notifications
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS message TEXT;

CREATE INDEX IF NOT EXISTS idx_ticket_notifs_unread ON ticket_notifications (user_id) WHERE is_read = FALSE;

CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id          UUID    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    scan_confirmed   BOOLEAN NOT NULL DEFAULT TRUE,
    usage_depleted   BOOLEAN NOT NULL DEFAULT TRUE,
    expiry_warning   BOOLEAN NOT NULL DEFAULT TRUE,
    expired          BOOLEAN NOT NULL DEFAULT TRUE,
    renewal_prompt   BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
