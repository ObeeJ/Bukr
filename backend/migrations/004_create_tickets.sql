-- 004_create_tickets.sql

CREATE TABLE IF NOT EXISTS tickets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       VARCHAR(50) UNIQUE NOT NULL,
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_type     VARCHAR(50) NOT NULL DEFAULT 'General Admission',
    quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 10),
    unit_price      DECIMAL(12, 2) NOT NULL,
    total_price     DECIMAL(12, 2) NOT NULL,
    discount_applied DECIMAL(5, 2) DEFAULT 0,
    promo_code_id   UUID REFERENCES promo_codes(id),
    currency        VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status          VARCHAR(20) DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'expired', 'cancelled', 'refunded')),
    qr_code_data    TEXT NOT NULL,
    payment_ref     VARCHAR(255),
    payment_provider VARCHAR(20),
    excitement_rating INTEGER CHECK (excitement_rating BETWEEN 1 AND 5),
    scanned_at      TIMESTAMPTZ,
    scanned_by      UUID REFERENCES users(id),
    purchase_date   TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_payment_ref ON tickets(payment_ref);
