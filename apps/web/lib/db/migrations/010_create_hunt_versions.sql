-- Migration: retain creator hunt snapshots for version history and restore.
-- Snapshots are retained for 90 days; cleanup is also performed on writes.

CREATE TABLE IF NOT EXISTS hunt_versions (
  hunt_id     INTEGER        NOT NULL,
  version     INTEGER        NOT NULL,
  snapshot    JSONB          NOT NULL,
  created_by  TEXT           NOT NULL,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  PRIMARY KEY (hunt_id, version)
);

CREATE INDEX IF NOT EXISTS idx_hunt_versions_history
  ON hunt_versions (hunt_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_hunt_versions_created_at
  ON hunt_versions (created_at);
