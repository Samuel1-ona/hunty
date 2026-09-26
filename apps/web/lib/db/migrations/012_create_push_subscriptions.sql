-- Migration: persistent push subscription store.
--
-- Replaces the in-memory Map in subscriptionStore.ts so that
-- registered devices survive instance recycling.
--
-- The owner_secret column allows the push-tokens route to verify
-- wallet ownership without relying on a separate in-memory Map.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint      TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  subscription  JSONB NOT NULL,
  preferences   JSONB,
  owner_secret  TEXT NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_wallet_address
  ON push_subscriptions (wallet_address);
