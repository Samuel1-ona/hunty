-- Migration: create referrals, referrer_devices, and referral_payouts tables.
--
-- Replaces the in-memory Maps in lib/referralStore.ts:
--   referralMap           → referrals
--   referrerIpMap         → referrer_devices.client_ip
--   referrerSessionMap    → referrer_devices.session_id
--   payoutMap             → referral_payouts
--
-- In-memory Maps are process-scoped and are lost on every deploy, so the
-- referral leaderboard, anti-self-referral device tracking, and payout
-- records now live in PostgreSQL.

-- ── Referrals ────────────────────────────────────────────────────────────────
-- One row per referred wallet (referred_address is the natural key).
CREATE TABLE IF NOT EXISTS referrals (
  code                    TEXT        NOT NULL,
  referrer_address        TEXT        NOT NULL,
  referred_address        TEXT        PRIMARY KEY,
  registered_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_completed_at      TIMESTAMPTZ,
  first_completed_hunt_id INTEGER,
  bonus_awarded           BOOLEAN     NOT NULL DEFAULT FALSE,
  bonus_points            INTEGER     NOT NULL DEFAULT 0
);

-- Leaderboard aggregation groups by referrer_address.
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_address
  ON referrals (referrer_address);

-- Period cutoffs filter on registered_at.
CREATE INDEX IF NOT EXISTS idx_referrals_registered_at
  ON referrals (registered_at);

-- ── Referrer device tracking (anti-self-referral) ────────────────────────────
CREATE TABLE IF NOT EXISTS referrer_devices (
  referrer_address TEXT PRIMARY KEY,
  client_ip        TEXT,
  session_id       TEXT
);

-- ── Referral payouts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_payouts (
  id               TEXT        PRIMARY KEY,
  period           TEXT        NOT NULL
                              CHECK (period IN ('weekly','monthly','seasonal','manual')),
  referrer_address TEXT        NOT NULL,
  rank             INTEGER     NOT NULL,
  reward_amount    NUMERIC     NOT NULL,
  reward_type      TEXT        NOT NULL CHECK (reward_type IN ('xlm','points')),
  status           TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','processing','paid','failed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at     TIMESTAMPTZ,
  tx_hash          TEXT,
  -- A referrer may only ever have one payout per period: re-running payout
  -- allocations for the same period must not create duplicate payouts.
  UNIQUE (period, referrer_address)
);