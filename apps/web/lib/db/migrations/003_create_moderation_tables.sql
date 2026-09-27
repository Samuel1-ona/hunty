-- Migration: create moderation_queue and moderation_notifications tables.
--
-- Replaces the JSON files written to lib/moderation-data/ by lib/moderation/store.ts.
-- JSON files on the local filesystem are per-instance and lost on every deploy
-- or container restart.
--
-- Schema mirrors the existing TypeScript types in lib/moderation/types.ts:
--   ModerationSubmission  →  moderation_queue
--   CreatorModerationNotification  →  moderation_notifications

-- ── Submissions (the review queue) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moderation_queue (
  id                TEXT        PRIMARY KEY,
  hunt_id           INTEGER     NOT NULL,
  hunt_json         JSONB       NOT NULL,          -- full StoredHunt snapshot
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','approved','rejected')),
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       TEXT,
  rejection_reason  TEXT,
  auto_flags        TEXT[]      NOT NULL DEFAULT '{}',
  policy_violations TEXT[]      NOT NULL DEFAULT '{}',
  creator_email     TEXT
);

-- Look up a submission by hunt_id and status quickly.
CREATE INDEX IF NOT EXISTS idx_moderation_queue_hunt_id
  ON moderation_queue (hunt_id);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_status
  ON moderation_queue (status);

-- ── Creator notifications ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moderation_notifications (
  id             TEXT        PRIMARY KEY,
  hunt_id        INTEGER     NOT NULL,
  hunt_title     TEXT        NOT NULL,
  action         TEXT        NOT NULL CHECK (action IN ('approved','rejected')),
  reason         TEXT,
  creator_email  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read           BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_moderation_notifications_creator_email
  ON moderation_notifications (creator_email);

CREATE INDEX IF NOT EXISTS idx_moderation_notifications_read
  ON moderation_notifications (read);
