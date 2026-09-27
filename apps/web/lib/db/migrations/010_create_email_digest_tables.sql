-- Migration: create email digest tracking tables
--
-- Supports re-engagement email digests for lapsed players.
--
-- Tables:
--   player_email_preferences  → player email and digest subscription status
--   email_digest_sends        → track when digests were sent to prevent duplicates
--   email_unsubscribe_tokens  → secure tokens for unsubscribe links

-- ── Player Email Preferences ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_email_preferences (
  id                      TEXT        PRIMARY KEY,
  wallet_address          TEXT        NOT NULL UNIQUE,
  email                   TEXT        NOT NULL,
  digest_subscribed       BOOLEAN     NOT NULL DEFAULT FALSE,
  subscription_date       TIMESTAMPTZ DEFAULT NOW(),
  last_updated            TIMESTAMPTZ DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Look up preferences by wallet address.
CREATE INDEX IF NOT EXISTS idx_player_email_preferences_wallet
  ON player_email_preferences (wallet_address);

-- Look up subscribed players for digest sends.
CREATE INDEX IF NOT EXISTS idx_player_email_preferences_subscribed
  ON player_email_preferences (digest_subscribed, last_updated);

-- ── Email Digest Send History ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_digest_sends (
  id                      TEXT        PRIMARY KEY,
  player_id               TEXT        NOT NULL REFERENCES player_email_preferences(id),
  sent_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient_email         TEXT        NOT NULL,
  hunt_ids                INTEGER[]   NOT NULL DEFAULT '{}',
  categories              TEXT[]      NOT NULL DEFAULT '{}',
  success                 BOOLEAN     DEFAULT TRUE,
  error_message           TEXT
);

-- Fast lookup: when was the last digest sent to this player?
CREATE INDEX IF NOT EXISTS idx_email_digest_sends_player_sent
  ON email_digest_sends (player_id, sent_at DESC);

-- ── Unsubscribe Tokens ─────────────────────────────────────────────────────
-- Secure, single-use tokens for unsubscribe links
CREATE TABLE IF NOT EXISTS email_unsubscribe_tokens (
  id                      TEXT        PRIMARY KEY,
  player_id               TEXT        NOT NULL REFERENCES player_email_preferences(id),
  token                   TEXT        NOT NULL UNIQUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at              TIMESTAMPTZ NOT NULL,
  used_at                 TIMESTAMPTZ
);

-- Fast lookup by token during unsubscribe.
CREATE INDEX IF NOT EXISTS idx_email_unsubscribe_tokens_token
  ON email_unsubscribe_tokens (token);

-- Clean up expired tokens.
CREATE INDEX IF NOT EXISTS idx_email_unsubscribe_tokens_expires
  ON email_unsubscribe_tokens (expires_at);
