-- Migration: create hunt_collaborators and collaborator_presence tables.
--
-- Moves collaboration state from ephemeral localStorage/memory stores to
-- durable PostgreSQL so that presence and permissions are consistent across
-- all server instances and clients.

CREATE TABLE IF NOT EXISTS hunt_collaborators (
  id              BIGSERIAL    PRIMARY KEY,
  hunt_id         INTEGER      NOT NULL,
  wallet_address  TEXT         NOT NULL,
  role            TEXT         NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_at      BIGINT       NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
  invited_by      TEXT         NOT NULL,
  accepted        BOOLEAN      NOT NULL DEFAULT FALSE,
  last_active_at  BIGINT,
  editing_field   TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hunt_collaborator UNIQUE (hunt_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_hunt_collaborators_hunt_id
  ON hunt_collaborators (hunt_id);

CREATE TABLE IF NOT EXISTS collaborator_presence (
  id              BIGSERIAL    PRIMARY KEY,
  hunt_id         INTEGER      NOT NULL,
  wallet_address  TEXT         NOT NULL,
  editing_field   TEXT,
  last_ping_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hunt_presence UNIQUE (hunt_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_collaborator_presence_hunt_id
  ON collaborator_presence (hunt_id);

CREATE INDEX IF NOT EXISTS idx_collaborator_presence_last_ping
  ON collaborator_presence (last_ping_at DESC);
