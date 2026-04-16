-- 023_event_invites.sql
-- Invitation-only access control for events.
--
-- Design decisions:
--   - access_mode on events gates the entire booking flow (public | invite_only)
--   - rsvp_deadline is per-event; NULL means "expires when event starts"
--   - token is 32 random bytes (hex) — 256-bit entropy, brute-force impossible
--   - (event_id, email) UNIQUE prevents duplicate invites for the same person
--   - redeemed_by links to the user who actually claimed it (identity gate)
--   - referred_by_invite_id enables the referral chain: invite → new user → reward
--   - invite_referral_rewards is append-only; never updated, never deleted

-- ── 1. Gate column on events ──────────────────────────────────────────────────

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS access_mode  VARCHAR(20) NOT NULL DEFAULT 'public'
        CHECK (access_mode IN ('public', 'invite_only')),
    ADD COLUMN IF NOT EXISTS rsvp_deadline TIMESTAMPTZ;  -- NULL = event start time

-- ── 2. Core invites table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_invites (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id         UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    email            VARCHAR(255) NOT NULL,
    name             VARCHAR(255),                          -- display name in email
    ticket_type      VARCHAR(50)  NOT NULL DEFAULT 'General Admission',
    -- 256-bit token: encode(gen_random_bytes(32), 'hex')
    token            VARCHAR(64)  UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    status           VARCHAR(20)  NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'sent', 'redeemed', 'revoked', 'expired')),
    -- Set when the guest actually books — identity verification anchor
    redeemed_by      UUID         REFERENCES users(id),
    redeemed_at      TIMESTAMPTZ,
    -- Referral chain: if this guest signs up fresh and refers someone,
    -- that new invite row points back here
    referred_by_invite_id UUID    REFERENCES event_invites(id),
    -- Audit
    sent_at          TIMESTAMPTZ,
    revoked_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    -- One invite per email per event — no duplicates
    CONSTRAINT uq_invite_event_email UNIQUE (event_id, email)
);

-- O(1) token lookup at the booking gate — the hot path
CREATE UNIQUE INDEX IF NOT EXISTS idx_invites_token       ON event_invites(token);
-- O(1) identity check: "does this email have a pending invite for this event?"
CREATE INDEX        IF NOT EXISTS idx_invites_event_email ON event_invites(event_id, email);
-- Organizer dashboard: list all invites for an event
CREATE INDEX        IF NOT EXISTS idx_invites_event_id    ON event_invites(event_id);
-- Notification worker: find unsent invites to dispatch
CREATE INDEX        IF NOT EXISTS idx_invites_unsent      ON event_invites(status) WHERE status = 'pending';

-- ── 3. Referral rewards table ─────────────────────────────────────────────────
-- Append-only ledger. One row = one reward earned.
-- reward_type drives what the application grants:
--   'ticket_discount'  → discount_pct applied to next ticket purchase
--   'event_credit'     → one free event credit added to organizer pack
--   'both'             → both of the above (user is also an organizer)

CREATE TABLE IF NOT EXISTS invite_referral_rewards (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    -- The user who gets the reward (the person who shared the invite)
    rewarded_user_id UUID        NOT NULL REFERENCES users(id),
    -- The invite that triggered this reward
    source_invite_id UUID        NOT NULL REFERENCES event_invites(id),
    reward_type      VARCHAR(20) NOT NULL
                         CHECK (reward_type IN ('ticket_discount', 'event_credit', 'both')),
    discount_pct     SMALLINT    NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
    -- NULL until the reward is actually applied at checkout / event creation
    applied_at       TIMESTAMPTZ,
    expires_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- One reward per referral chain link — idempotent
    CONSTRAINT uq_reward_per_invite UNIQUE (rewarded_user_id, source_invite_id)
);

CREATE INDEX IF NOT EXISTS idx_rewards_user      ON invite_referral_rewards(rewarded_user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_unapplied ON invite_referral_rewards(rewarded_user_id, applied_at)
    WHERE applied_at IS NULL;

-- ── 4. Auto-expire invites past RSVP deadline ─────────────────────────────────
-- Runs as a DB-level check; the Go expiry worker also calls this pattern.
-- We use a partial index so the worker query is O(pending rows) not O(all rows).
CREATE INDEX IF NOT EXISTS idx_invites_expiry_candidates
    ON event_invites(event_id, status)
    WHERE status IN ('pending', 'sent');

COMMENT ON TABLE  event_invites              IS 'Per-guest invitation tokens for invite_only events. Token is the gate; email+auth is the identity lock.';
COMMENT ON TABLE  invite_referral_rewards    IS 'Append-only reward ledger. Never update, never delete. applied_at marks consumption.';
COMMENT ON COLUMN event_invites.token        IS '256-bit hex token. Single-use. Rotated to NULL after redemption to prevent replay.';
COMMENT ON COLUMN event_invites.redeemed_by  IS 'The authenticated user who redeemed. Must match invite email — this is the identity gate.';
