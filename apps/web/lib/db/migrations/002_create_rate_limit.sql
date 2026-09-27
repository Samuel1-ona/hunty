-- Migration: create rate_limit table for distributed, durable rate limiting.
--
-- Replaces the in-memory process-local Map in lib/rate-limit.ts.  A Map
-- only works in single-instance deployments and is wiped on every cold
-- start or deploy.  Moving the counters to PostgreSQL makes them consistent
-- across all serverless instances and survives restarts.
--
-- Design notes:
--   * One row per (key, expires_at) pair.  `key` encodes the IP or wallet address
--     prefixed with the limiter name, e.g. "ratelimit_1.2.3.4".
--   * `expires_at` records the end of the current window so the counter can
--     be atomically reset when a new window begins.
--   * The UPSERT in rateLimit() increments the counter while leaving rows
--     from previous windows in place; a periodic cleanup removes stale rows.
--   * An index on `expires_at` lets a background job cheaply DELETE
--     rows WHERE expires_at < NOW().

CREATE TABLE IF NOT EXISTS rate_limit (
  key         TEXT        NOT NULL,
  count       INTEGER     NOT NULL DEFAULT 1,
  expires_at  TIMESTAMPTZ NOT NULL,
  CONSTRAINT rate_limit_pkey PRIMARY KEY (key, expires_at)
);

-- Index to support fast expired-row cleanup.
CREATE INDEX IF NOT EXISTS idx_rate_limit_expires_at
  ON rate_limit (expires_at);
