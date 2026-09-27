-- Migration: create hunt_analytics table.
--
-- Replaces the JSON file used by lib/huntAnalytics.ts:
--   data/hunt-analytics.json  →  hunt_analytics  (one row per hunt)
--
-- Scalar counters (views, starts, completions, total_completion_time_seconds)
-- are stored as INTEGER columns for cheap aggregation.  The three evolving
-- arrays (clue_drop_off, demographics, time_series) are stored as JSONB so
-- the schema never needs to change when those shapes evolve — only the
-- application layer changes.

CREATE TABLE IF NOT EXISTS hunt_analytics (
  hunt_id                       INTEGER     PRIMARY KEY,
  views                         INTEGER     NOT NULL DEFAULT 0,
  starts                        INTEGER     NOT NULL DEFAULT 0,
  completions                   INTEGER     NOT NULL DEFAULT 0,
  total_completion_time_seconds INTEGER     NOT NULL DEFAULT 0,
  clue_drop_off                 JSONB       NOT NULL DEFAULT '[]',
  demographics                  JSONB       NOT NULL DEFAULT '[]',
  time_series                   JSONB       NOT NULL DEFAULT '[]',
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
