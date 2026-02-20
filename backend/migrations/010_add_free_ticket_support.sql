-- 010_add_free_ticket_support.sql
-- Add explicit support for free tickets and scanner delegation

-- Add requires_payment flag to events
-- When FALSE, tickets can be claimed without payment
ALTER TABLE events 
ADD COLUMN requires_payment BOOLEAN DEFAULT TRUE;

-- Add is_free flag to tickets
-- Distinguishes free tickets from paid tickets for analytics
ALTER TABLE tickets 
ADD COLUMN is_free BOOLEAN DEFAULT FALSE;

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
