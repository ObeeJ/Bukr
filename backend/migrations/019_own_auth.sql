-- 019_own_auth.sql
-- Replace Supabase auth with native JWT auth.
-- supabase_uid becomes nullable so existing rows are preserved during migration.
-- New columns handle password hashing, refresh token rotation, and OTP reset.
-- admin_users is a completely separate table signed with a different JWT secret.

ALTER TABLE users
    ALTER COLUMN supabase_uid DROP NOT NULL;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash      TEXT,
    ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT,
    ADD COLUMN IF NOT EXISTS otp_hash           TEXT,
    ADD COLUMN IF NOT EXISTS otp_expires_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS otp_attempts       SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS email_verified     BOOLEAN  NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_login_at      TIMESTAMPTZ;

-- Widen the user_type constraint to include all roles used in the codebase.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check
    CHECK (user_type IN ('user', 'organizer', 'vendor', 'influencer', 'admin'));

-- Admin users are completely separate from regular users.
-- They are signed with ADMIN_JWT_SECRET, not APP_JWT_SECRET.
-- Cross-use is cryptographically impossible.
CREATE TABLE IF NOT EXISTS admin_users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255) UNIQUE NOT NULL,
    name                VARCHAR(255) NOT NULL,
    password_hash       TEXT NOT NULL,
    refresh_token_hash  TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
