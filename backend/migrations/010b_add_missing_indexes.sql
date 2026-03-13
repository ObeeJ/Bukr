-- 010_add_missing_indexes.sql
-- Performance optimization: add missing indexes for common query patterns

-- Reverse lookup: which users favorited a specific event
CREATE INDEX IF NOT EXISTS idx_favorites_event ON favorites(event_id);

-- Payment to ticket lookup (refunds, reconciliation)
CREATE INDEX IF NOT EXISTS idx_payments_ticket ON payment_transactions(ticket_id);

-- Scanner activity reports (who scanned what)
CREATE INDEX IF NOT EXISTS idx_tickets_scanned_by ON tickets(scanned_by);
