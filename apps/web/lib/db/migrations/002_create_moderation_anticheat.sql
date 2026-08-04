-- Migration: create moderation and anti-cheat tables for durable storage.
--
-- Replaces file-based JSON storage (lib/moderation-data/*.json and
-- lib/anti-cheat-data/*.json) with PostgreSQL tables. The JSON files
-- were per-instance on serverless platforms and were lost on deploys
-- and cold starts.
--
-- Anti-cheat config is stored in the existing app_settings table
-- (key = 'anti_cheat_config') following the featuredHuntDb pattern.

-- Moderation ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS moderation_submissions (
  id                TEXT PRIMARY KEY,
  hunt_id           INTEGER NOT NULL,
  hunt              JSONB NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  submitted_at      BIGINT NOT NULL,
  reviewed_at       BIGINT,
  reviewed_by       TEXT,
  rejection_reason  TEXT,
  auto_flags        TEXT[] NOT NULL DEFAULT '{}',
  policy_violations TEXT[] NOT NULL DEFAULT '{}',
  creator_email     TEXT
);

CREATE INDEX IF NOT EXISTS idx_moderation_submissions_status
  ON moderation_submissions (status);

CREATE INDEX IF NOT EXISTS idx_moderation_submissions_hunt_id
  ON moderation_submissions (hunt_id);

CREATE TABLE IF NOT EXISTS moderation_notifications (
  id            TEXT PRIMARY KEY,
  hunt_id       INTEGER NOT NULL,
  hunt_title    TEXT NOT NULL,
  action        TEXT NOT NULL,
  reason        TEXT,
  creator_email TEXT,
  created_at    BIGINT NOT NULL,
  read          BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_moderation_notifications_creator_email
  ON moderation_notifications (creator_email);

-- Anti-cheat ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS anti_cheat_bans (
  wallet    TEXT NOT NULL,
  ip        TEXT NOT NULL,
  reason    TEXT NOT NULL,
  banned_at BIGINT NOT NULL,
  banned_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_bans_wallet
  ON anti_cheat_bans (wallet);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_bans_ip
  ON anti_cheat_bans (ip);

CREATE TABLE IF NOT EXISTS anti_cheat_answers (
  id                SERIAL PRIMARY KEY,
  hunt_id           INTEGER NOT NULL,
  clue_id           INTEGER NOT NULL,
  wallet            TEXT NOT NULL,
  ip                TEXT NOT NULL,
  correct           BOOLEAN NOT NULL,
  server_timestamp  BIGINT NOT NULL,
  client_timestamp  BIGINT,
  score             INTEGER NOT NULL,
  bonus_points      INTEGER NOT NULL,
  anomaly_flags     TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_answers_wallet
  ON anti_cheat_answers (wallet);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_answers_server_timestamp
  ON anti_cheat_answers (server_timestamp);

CREATE TABLE IF NOT EXISTS anti_cheat_anomalies (
  id        TEXT PRIMARY KEY,
  wallet    TEXT NOT NULL,
  ip        TEXT NOT NULL,
  type      TEXT NOT NULL,
  details   TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  hunt_id   INTEGER NOT NULL,
  clue_id   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_anomalies_wallet
  ON anti_cheat_anomalies (wallet);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_anomalies_timestamp
  ON anti_cheat_anomalies (timestamp);

CREATE TABLE IF NOT EXISTS anti_cheat_tracking (
  tracking_key         TEXT PRIMARY KEY,
  last_submission_time BIGINT NOT NULL,
  attempt_count        INTEGER NOT NULL
);
