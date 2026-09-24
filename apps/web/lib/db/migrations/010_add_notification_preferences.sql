-- Migration: durable, wallet-scoped notification preferences.
--
-- A wallet is the user identity shared by the web and mobile clients. Storing
-- the complete document here means changing a category on one device is
-- visible to every other device the player uses.

CREATE TABLE IF NOT EXISTS notification_preferences (
  wallet_address TEXT PRIMARY KEY,
  preferences    JSONB NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_updated_at
  ON notification_preferences (updated_at);
