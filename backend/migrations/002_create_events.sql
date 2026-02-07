-- 002_create_events.sql

CREATE TABLE IF NOT EXISTS events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    date            DATE NOT NULL,
    time            TIME NOT NULL,
    end_date        DATE,
    location        VARCHAR(500) NOT NULL,
    price           DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'NGN',
    category        VARCHAR(100) NOT NULL,
    emoji           VARCHAR(10),
    event_key       VARCHAR(50) UNIQUE NOT NULL,
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'cancelled', 'completed')),
    total_tickets   INTEGER NOT NULL DEFAULT 0,
    available_tickets INTEGER NOT NULL DEFAULT 0,
    thumbnail_url   TEXT,
    video_url       TEXT,
    flier_url       TEXT,
    is_featured     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_event_key ON events(event_key);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
