-- Migration: add submitted_by to moderation_submissions.
--
-- Tracks the wallet address that submitted each hunt for moderation.
-- Enables per-identity rate limiting and auditability.

ALTER TABLE moderation_submissions
  ADD COLUMN submitted_by TEXT;

CREATE INDEX IF NOT EXISTS idx_moderation_submissions_submitted_by
  ON moderation_submissions (submitted_by);
