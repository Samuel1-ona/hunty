-- Migration: create hunt audit log table for tracking edits, deletes, and refunds.

CREATE TABLE IF NOT EXISTS hunt_audit_log (
  id          BIGSERIAL    NOT NULL,
  hunt_id     INTEGER      NOT NULL,
  action      TEXT         NOT NULL,
  actor       TEXT         NOT NULL,
  diff        JSONB        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_hunt_audit_log_hunt_id
  ON hunt_audit_log (hunt_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hunt_audit_log_actor
  ON hunt_audit_log (actor, created_at DESC);
