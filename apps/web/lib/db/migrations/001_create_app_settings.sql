-- Migration: create app_settings table for persistent key/value server state.
--
-- This replaces the ephemeral featuredHuntServer.json file that was previously
-- written to process.cwd(). On serverless platforms the local filesystem is
-- per-instance and read-only, so the JSON file was lost on every deploy and
-- was inconsistent across instances.
--
-- The table uses a single-row pattern (keyed by `key`) so that we can
-- generalise to other server-side settings without schema changes.
-- The featured hunt is stored under key = 'featured_hunt_id'.

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the initial featured_hunt_id row (value starts as NULL = no featured
-- hunt set). We use INSERT ... ON CONFLICT DO NOTHING so that re-running this
-- migration on an already-initialised database is idempotent.
INSERT INTO app_settings (key, value)
VALUES ('featured_hunt_id', NULL)
ON CONFLICT (key) DO NOTHING;
