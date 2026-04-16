-- Migration 022: system_logs table + missing performance indexes
--
-- system_logs: structured log sink for gateway-level events (errors, warnings).
-- Written to by the Go gateway on critical paths. Admin reads via GET /admin/system/logs.
--
-- Missing composite indexes identified in audit:
--   tickets(event_id, status)   — every admin ticket filter was doing a seq scan
--   scan_log(scanned_at DESC)   — time-range queries on scan activity were O(n)
--   platform_revenue(organizer_id, created_at) — per-organizer finance queries

CREATE TABLE IF NOT EXISTS system_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  level      TEXT        NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  message    TEXT        NOT NULL,
  meta       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level   ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at DESC);

-- Composite index: admin ticket list filtered by event + status
CREATE INDEX IF NOT EXISTS idx_tickets_event_status
  ON tickets(event_id, status);

-- Composite index: scan activity time-range queries
CREATE INDEX IF NOT EXISTS idx_scan_log_scanned_at
  ON scan_log(scanned_at DESC);

-- Composite index: per-organizer revenue queries in finance dashboard
CREATE INDEX IF NOT EXISTS idx_revenue_organizer_created
  ON platform_revenue(organizer_id, created_at DESC)
  WHERE organizer_id IS NOT NULL;

-- Composite index: daily revenue aggregation (timeseries endpoint)
CREATE INDEX IF NOT EXISTS idx_revenue_date_trunc
  ON platform_revenue(DATE_TRUNC('day', created_at));
