-- Migration: durable push subscription store.
--
-- Subscriptions are keyed by their push endpoint URL (which is unique per
-- device/browser).  Storing them in PostgreSQL means they survive instance
-- recycles and are shared across all serverless instances.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint       TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  subscription   JSONB NOT NULL,
  registered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  preferences    JSONB
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_wallet_address
  ON push_subscriptions (wallet_address);
