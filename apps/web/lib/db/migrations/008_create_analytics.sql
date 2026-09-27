-- Migration: create hunt_views and hint_usage_events tables.
--
-- Replaces two JSON files used by lib/analytics.ts:
--   data/hunt-views.json   →  hunt_views          (one row per hunt, upserted on each view)
--   data/hint-usage.json   →  hint_usage_events   (append-only log of hint reveals)
--
-- These files were per-instance and lost on every deploy.  Moving to Postgres
-- makes view counts and hint-reveal history durable across deploys and
-- multi-instance setups.

-- ── Hunt view counters ───────────────────────────────────────────────────────
-- One row per hunt.  views is incremented atomically via INSERT … ON CONFLICT DO UPDATE.
CREATE TABLE IF NOT EXISTS hunt_views (
  hunt_id         INTEGER     PRIMARY KEY,
  views           INTEGER     NOT NULL DEFAULT 0,
  last_viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Even though hunt_id is the primary key, an explicit index here allows the
-- planner to use an index-only scan on the column in join queries.
CREATE INDEX IF NOT EXISTS idx_hunt_views_hunt_id
  ON hunt_views (hunt_id);

-- ── Hint-reveal event log ────────────────────────────────────────────────────
-- Append-only.  The wallet column stores an HMAC hash of the raw address so
-- raw wallet addresses are never persisted (matches existing JSON behaviour).
CREATE TABLE IF NOT EXISTS hint_usage_events (
  id           BIGSERIAL   PRIMARY KEY,
  hunt_id      INTEGER     NOT NULL,
  clue_id      INTEGER     NOT NULL,
  hint_index   INTEGER     NOT NULL,
  wallet_hash  TEXT        NOT NULL,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hint_usage_events_hunt_id
  ON hint_usage_events (hunt_id);
