-- 009_create_triggers.sql

-- Auto-decrement available tickets on purchase
CREATE OR REPLACE FUNCTION decrement_available_tickets()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE events
    SET available_tickets = available_tickets - NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.event_id
      AND available_tickets >= NEW.quantity;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Not enough tickets available';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decrement_tickets ON tickets;
CREATE TRIGGER trg_decrement_tickets
AFTER INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION decrement_available_tickets();

-- Auto-increment promo used_count on ticket purchase with promo
CREATE OR REPLACE FUNCTION increment_promo_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.promo_code_id IS NOT NULL THEN
        UPDATE promo_codes
        SET used_count = used_count + 1,
            updated_at = NOW()
        WHERE id = NEW.promo_code_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_promo ON tickets;
CREATE TRIGGER trg_increment_promo
AFTER INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION increment_promo_usage();

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON tickets;
CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_promo_codes_updated_at ON promo_codes;
CREATE TRIGGER trg_promo_codes_updated_at BEFORE UPDATE ON promo_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_influencers_updated_at ON influencers;
CREATE TRIGGER trg_influencers_updated_at BEFORE UPDATE ON influencers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payment_transactions;
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
