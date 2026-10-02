-- Migration: durable hunt schedules processed by an external cron/queue worker.
--
-- `apps/web/lib/huntScheduling.ts` holds the pure decision logic for hunt
-- lifecycle transitions (scheduled -> active -> ended) and start reminders, but
-- the schedules themselves previously lived only in process memory. A redeploy
-- or a serverless cold start therefore dropped them and scheduled hunts never
-- went live. This table is the durable source of truth; the worker at
-- POST /api/cron/hunt-schedules re-evaluates rows here on a scheduler tick
-- instead of relying on an in-process timer.
--
-- Times are stored as epoch seconds (UTC) so the worker is timezone-agnostic
-- and comparisons stay cheap. The application layer converts to the
-- millisecond timestamps `huntScheduling.ts` works with.

CREATE TABLE IF NOT EXISTS hunt_schedules (
  hunt_id        INTEGER     PRIMARY KEY,
  title          TEXT,
  creator_wallet TEXT,
  creator_email  TEXT,
  start_at       BIGINT      NOT NULL,                       -- epoch seconds (UTC)
  end_at         BIGINT,                                     -- epoch seconds (UTC)
  status         TEXT        NOT NULL DEFAULT 'scheduled',   -- scheduled | active | ended
  processed_at   BIGINT,                                     -- epoch seconds of last transition/reminder
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The worker's "due" query filters on status plus the start boundary (reminder
-- window) and the end boundary (active -> ended), so index both.
CREATE INDEX IF NOT EXISTS idx_hunt_schedules_due
  ON hunt_schedules (status, start_at);

CREATE INDEX IF NOT EXISTS idx_hunt_schedules_end
  ON hunt_schedules (status, end_at);
