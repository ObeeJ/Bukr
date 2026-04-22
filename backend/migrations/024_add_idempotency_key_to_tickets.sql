-- 024_add_idempotency_key_to_tickets.sql
-- Add idempotency_key to tickets table to prevent duplicate purchases.

ALTER TABLE tickets ADD COLUMN idempotency_key VARCHAR(255);

-- Unique index on user_id, event_id, and idempotency_key.
-- This ensures that a single user cannot submit the same purchase request multiple times.
-- We only apply this to 'valid' (pending) tickets to allow retries if a previous attempt was cancelled.
CREATE UNIQUE INDEX idx_tickets_idempotency 
ON tickets (user_id, event_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL AND status IN ('valid', 'used');
