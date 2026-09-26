-- Migration: create anti_cheat_* tables.
--
-- Replaces four JSON files written under lib/anti-cheat-data/ by lib/anti-cheat.ts.
-- These files are per-instance and lost on every deploy, making bans, anomalies
-- and submission history completely unreliable in multi-instance deployments.
--
-- Schema mirrors the private interfaces in lib/anti-cheat.ts:
--   StoredAnswer     →  anti_cheat_answers
--   AnomalyRecord    →  anti_cheat_anomalies
--   BanRecord        →  anti_cheat_bans
--   TrackingData     →  anti_cheat_tracking  (one row per wallet/hunt/clue key)

-- ── Submitted answers ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anti_cheat_answers (
  id                BIGSERIAL   PRIMARY KEY,
  hunt_id           INTEGER     NOT NULL,
  clue_id           INTEGER     NOT NULL,
  wallet            TEXT        NOT NULL,
  ip                TEXT        NOT NULL,
  correct           BOOLEAN     NOT NULL,
  server_timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_timestamp  TIMESTAMPTZ,
  score             INTEGER     NOT NULL DEFAULT 0,
  bonus_points      INTEGER     NOT NULL DEFAULT 0,
  anomaly_flags     TEXT[]      NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_answers_wallet
  ON anti_cheat_answers (wallet);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_answers_ip
  ON anti_cheat_answers (ip);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_answers_server_timestamp
  ON anti_cheat_answers (server_timestamp);

-- ── Detected anomalies ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anti_cheat_anomalies (
  id         TEXT        PRIMARY KEY,
  wallet     TEXT        NOT NULL,
  ip         TEXT        NOT NULL,
  type       TEXT        NOT NULL,
  details    TEXT        NOT NULL DEFAULT '',
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hunt_id    INTEGER     NOT NULL,
  clue_id    INTEGER     NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_anomalies_wallet
  ON anti_cheat_anomalies (wallet);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_anomalies_timestamp
  ON anti_cheat_anomalies (timestamp);

-- ── Bans ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anti_cheat_bans (
  wallet     TEXT        NOT NULL,
  ip         TEXT        NOT NULL,
  reason     TEXT        NOT NULL,
  banned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  banned_by  TEXT        NOT NULL,
  CONSTRAINT anti_cheat_bans_pkey PRIMARY KEY (wallet)
);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_bans_ip
  ON anti_cheat_bans (ip);

-- ── Per-key submission tracking (replaces in-memory TrackingData object) ─────
-- key = "<wallet>_<huntId>_<clueId>"
CREATE TABLE IF NOT EXISTS anti_cheat_tracking (
  key                  TEXT        PRIMARY KEY,
  last_submission_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempt_count        INTEGER     NOT NULL DEFAULT 1
);
