-- Migration 017: Event coordinates, online link, and integrity constraints
--
-- latitude / longitude: stored as DECIMAL(9,6) — sufficient for ~0.1m precision globally.
--   Used by the distance feature and future map rendering.
--   Nullable: physical events may not have coordinates yet (backfill via geocoding job).
--
-- online_link: the Zoom / Google Meet / YouTube Live URL for online and hybrid events.
--   Nullable at the DB level; enforced NOT NULL for online/hybrid via CHECK constraint.
--
-- Constraint logic:
--   online and hybrid events MUST have an online_link.
--   physical events MUST NOT have coordinates = NULL if they want distance features
--   (we can't enforce that here without geocoding, so we leave it nullable).

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS latitude   DECIMAL(9,6),
  ADD COLUMN IF NOT EXISTS longitude  DECIMAL(9,6),
  ADD COLUMN IF NOT EXISTS online_link TEXT;

-- Enforce: online and hybrid events must supply a link.
-- This fires at INSERT and UPDATE time — organizer cannot publish without it.
ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_online_link_required;
ALTER TABLE events ADD CONSTRAINT chk_online_link_required CHECK (
  event_type = 'physical'
  OR (event_type IN ('online', 'hybrid') AND online_link IS NOT NULL AND online_link <> '')
);

-- Enforce: coordinates must be in valid range if provided.
ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_coordinates_range;
ALTER TABLE events ADD CONSTRAINT chk_coordinates_range CHECK (
  (latitude  IS NULL OR latitude  BETWEEN -90  AND  90)
  AND
  (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);

-- Spatial index: used for future "events near me" queries.
-- A partial index on non-null coordinates keeps it lean.
CREATE INDEX IF NOT EXISTS idx_events_coordinates
  ON events(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMENT ON COLUMN events.latitude    IS 'WGS84 latitude. Populated by geocoding job or organizer input. Required for distance feature.';
COMMENT ON COLUMN events.longitude   IS 'WGS84 longitude. Populated by geocoding job or organizer input. Required for distance feature.';
COMMENT ON COLUMN events.online_link IS 'Zoom / Meet / YouTube URL. Required for online and hybrid events (enforced by chk_online_link_required).';
