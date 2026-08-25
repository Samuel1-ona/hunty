-- Migration: create hunt_drafts table for cloud-synced creator drafts.
--
-- The frontend hook (hooks/useHuntDraftAutoSave.ts) currently saves drafts
-- only to localStorage with a TODO stub where the cloud-sync call should go.
-- This table backs the POST/GET/DELETE /api/v1/drafts endpoint so drafts
-- persist across devices and browser clears for connected wallet users.
--
-- A draft belongs to a wallet address (owner_key).  The payload column stores
-- the full HuntDraftSave JSON so the schema never needs to change when the
-- draft shape evolves — only the application layer changes.

CREATE TABLE IF NOT EXISTS hunt_drafts (
  draft_id   TEXT        PRIMARY KEY,
  owner_key  TEXT        NOT NULL,       -- wallet public key
  label      TEXT        NOT NULL DEFAULT 'Untitled Draft',
  payload    JSONB       NOT NULL,       -- full HuntDraftSave JSON
  saved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recovered  BOOLEAN     NOT NULL DEFAULT FALSE
);

-- Look up all drafts for a given wallet quickly.
CREATE INDEX IF NOT EXISTS idx_hunt_drafts_owner_key
  ON hunt_drafts (owner_key);

-- Order drafts by most-recently-saved.
CREATE INDEX IF NOT EXISTS idx_hunt_drafts_saved_at
  ON hunt_drafts (saved_at DESC);
