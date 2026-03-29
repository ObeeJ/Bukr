-- Migration 021: Admin audit log
-- Every admin action is recorded here. Immutable — no UPDATE, no DELETE.
-- This is the compliance and forensic trail.

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  admin_email TEXT        NOT NULL,
  action      TEXT        NOT NULL,  -- e.g. 'user.deactivate', 'event.feature', 'payout.approve'
  entity_type TEXT        NOT NULL,  -- 'user', 'event', 'vendor', 'influencer', 'payout', 'flag'
  entity_id   TEXT,                  -- UUID of the affected row
  meta        JSONB,                 -- before/after snapshot or extra context
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin    ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity   ON admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON admin_audit_log(created_at DESC);
