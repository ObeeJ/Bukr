-- Migration 016: Add event_type and city to events
--
-- event_type: physical | online | hybrid
--   - physical: venue-based, location required, vendor matchmaking uses city
--   - online:   no venue, location holds a URL or "Online", city = 'Online'
--   - hybrid:   both a venue and a stream link
--
-- city: extracted city name for vendor matchmaking and distance features.
--   Previously the Rust service split location on ',' which was fragile.
--   Now city is a first-class indexed column, same pattern as vendors.city.

-- 1. Add event_type with safe default (all existing events are physical)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(20) NOT NULL DEFAULT 'physical'
    CHECK (event_type IN ('physical', 'online', 'hybrid'));

-- 2. Add city column — nullable initially so backfill can run first
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- 3. Backfill city from existing location strings.
--    Strategy: take the last comma-separated segment, trimmed.
--    "Eko Hotel, Victoria Island, Lagos" → "Lagos"
--    "National Theatre, Lagos"           → "Lagos"
--    "Abuja International Conference"    → full string (no comma)
--    Online events will be set to 'Online' after event_type backfill.
UPDATE events
SET city = TRIM(SPLIT_PART(location, ',', ARRAY_LENGTH(STRING_TO_ARRAY(location, ','), 1)))
WHERE city IS NULL;

-- 4. Online events get city = 'Online' (no physical location)
UPDATE events SET city = 'Online' WHERE event_type = 'online' AND city IS NULL;

-- 5. Enforce NOT NULL now that backfill is complete
ALTER TABLE events ALTER COLUMN city SET NOT NULL;
ALTER TABLE events ALTER COLUMN city SET DEFAULT '';

-- 6. Indexes — city is used in vendor matchmaking and future distance queries
CREATE INDEX IF NOT EXISTS idx_events_city       ON events(city);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
-- Composite for context-aware discovery: city + type + date + status
CREATE INDEX IF NOT EXISTS idx_events_discovery
  ON events(city, event_type, date, status)
  WHERE status = 'active';

COMMENT ON COLUMN events.event_type IS 'physical | online | hybrid. Controls vendor matching, distance display, and calendar link behaviour.';
COMMENT ON COLUMN events.city IS 'Extracted city name. Indexed for vendor matchmaking and distance features. Set to ''Online'' for online events.';
