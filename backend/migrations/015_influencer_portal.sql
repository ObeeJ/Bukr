-- Migration 015: Influencer self-service portal
-- Adds user_type = 'influencer', links organizer-created influencer records
-- to Bukr user accounts, adds payout account storage, and creates the
-- influencer_payouts table for payout request tracking.

-- 1. Expand user_type to include influencer
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('user', 'organizer', 'admin', 'vendor', 'influencer'));

-- 2. Extend influencers table with portal fields
--    user_id is nullable: organizer-created influencers may not have Bukr accounts yet.
--    When an influencer claims their account via invite_token, user_id gets set.
ALTER TABLE influencers
  ADD COLUMN user_id           UUID         REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN payout_account    JSONB,
  -- payout_account shape: { bank_code, account_number, account_name, bank_name }
  ADD COLUMN pending_earnings  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN total_withdrawn   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  -- invite_token: sent to influencer's email so they can claim their portal account
  ADD COLUMN invite_token      VARCHAR(64)   UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  ADD COLUMN claimed_at        TIMESTAMPTZ;

CREATE INDEX idx_influencers_user  ON influencers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_influencers_token ON influencers(invite_token) WHERE invite_token IS NOT NULL;

-- 3. Influencer payout requests
--    Minimum payout: ₦5,000. Admin approves/rejects manually for now.
CREATE TABLE influencer_payouts (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID         NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  amount        DECIMAL(12,2) NOT NULL CHECK (amount >= 5000),
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending'
                  CHECK (status IN (
                    'pending',    -- awaiting admin approval
                    'processing', -- admin approved, transfer in flight
                    'paid',       -- funds sent
                    'failed'      -- transfer failed, amount returned to pending_earnings
                  )),
  payment_ref   VARCHAR(255),
  admin_note    TEXT,           -- optional note from admin on approval/rejection
  requested_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMPTZ,
  paid_at       TIMESTAMPTZ
);

CREATE INDEX idx_payouts_influencer ON influencer_payouts(influencer_id);
CREATE INDEX idx_payouts_status     ON influencer_payouts(status);
CREATE INDEX idx_payouts_requested  ON influencer_payouts(requested_at DESC);
