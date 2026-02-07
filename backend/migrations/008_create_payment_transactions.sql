-- 008_create_payment_transactions.sql

CREATE TABLE IF NOT EXISTS payment_transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id           UUID REFERENCES tickets(id),
    user_id             UUID NOT NULL REFERENCES users(id),
    provider            VARCHAR(20) NOT NULL CHECK (provider IN ('paystack', 'stripe')),
    provider_ref        VARCHAR(255) UNIQUE NOT NULL,
    amount              DECIMAL(12, 2) NOT NULL,
    currency            VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status              VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    provider_response   JSONB,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_ref ON payment_transactions(provider_ref);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment_transactions(status);
