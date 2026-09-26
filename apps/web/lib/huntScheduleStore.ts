/**
 * Durable persistence for hunt schedules.
 *
 * A schedule is the canonical record of when a hunt should transition
 * (`scheduled` -> `active` -> `ended`) and when its start reminder is due. The
 * decision logic itself stays in `@/lib/huntScheduling`; this module only
 * reads/writes the records and persists the statuses those pure functions
 * compute.
 *
 * PostgreSQL is used when `DATABASE_URL` is configured (see migration
 * `012_create_hunt_schedules.sql`). Otherwise an in-memory `Map` keeps unit
 * tests and local development working without a database. This module never
 * starts a timer of its own: a scheduler/queue worker invokes
 * `processDueHuntSchedules` (through `POST /api/cron/hunt-schedules`).
 */

import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  applyHuntScheduleTransitions,
  getReminderCandidates,
  type HuntReminderState,
} from "@/lib/huntScheduling";
import type { StoredHunt } from "@/lib/types";

export type HuntScheduleStatus = "scheduled" | "active" | "ended";

export interface HuntSchedule {
  huntId: number;
  title?: string;
  creatorWallet?: string;
  creatorEmail?: string;
  /** Epoch seconds (UTC). */
  startAt: number;
  /** Epoch seconds (UTC). */
  endAt?: number;
  status: HuntScheduleStatus;
  /** Epoch seconds (UTC) of the last applied transition or sent reminder. */
  processedAt?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface UpsertHuntScheduleInput {
  huntId: number;
  /** Epoch seconds (UTC). Optional when updating an existing schedule. */
  startAt?: number;
  /** Epoch seconds (UTC). */
  endAt?: number | null;
  status?: HuntScheduleStatus;
  title?: string | null;
  creatorWallet?: string | null;
  creatorEmail?: string | null;
  processedAt?: number | null;
}

/**
 * A scheduled hunt is worth evaluating as soon as it enters the 24h reminder
 * window, and an active hunt as soon as it reaches its end boundary. Keeping
 * both windows here lets `listDueHuntSchedules` be a single indexed scan; the
 * pure functions in `huntScheduling.ts` still make the actual decisions.
 */
const REMINDER_WINDOW_SECONDS = 24 * 60 * 60;
const TRANSITION_TOLERANCE_SECONDS = 60;

const VALID_STATUSES: HuntScheduleStatus[] = ["scheduled", "active", "ended"];

const memoryStore = new Map<number, HuntSchedule>();

function normalizeStatus(status: string | null | undefined): HuntScheduleStatus {
  const value = (status ?? "scheduled").toLowerCase();
  return (VALID_STATUSES as string[]).includes(value) ? (value as HuntScheduleStatus) : "scheduled";
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function cloneSchedule(schedule: HuntSchedule): HuntSchedule {
  return { ...schedule };
}

function toEpochSeconds(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? Math.floor(num) : undefined;
}

type HuntScheduleRow = {
  hunt_id: number | string;
  title: string | null;
  creator_wallet: string | null;
  creator_email: string | null;
  start_at: number | string;
  end_at: number | string | null;
  status: string;
  processed_at: number | string | null;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
};

function rowToSchedule(row: HuntScheduleRow): HuntSchedule {
  return {
    huntId: Number(row.hunt_id),
    title: row.title ?? undefined,
    creatorWallet: row.creator_wallet ?? undefined,
    creatorEmail: row.creator_email ?? undefined,
    startAt: toEpochSeconds(row.start_at) ?? 0,
    endAt: toEpochSeconds(row.end_at),
    status: normalizeStatus(row.status),
    processedAt: toEpochSeconds(row.processed_at),
    createdAt: toEpochSeconds(row.created_at),
    updatedAt: toEpochSeconds(row.updated_at),
  };
}

/** Read a single schedule by hunt id. */
export async function getHuntSchedule(huntId: number): Promise<HuntSchedule | undefined> {
  const fallback = memoryStore.get(huntId);
  if (!process.env.DATABASE_URL) return fallback ? cloneSchedule(fallback) : undefined;

  try {
    const sql = getDb();
    const [row] = (await sql`
      SELECT * FROM hunt_schedules WHERE hunt_id = ${huntId}
    `) as HuntScheduleRow[];
    if (!row) return fallback ? cloneSchedule(fallback) : undefined;

    const schedule = rowToSchedule(row);
    memoryStore.set(schedule.huntId, schedule);
    return cloneSchedule(schedule);
  } catch (error) {
    // Fall back to the last known process-local value instead of failing the
    // worker during a transient database outage.
    logger.warn("Failed to read hunt schedule from database", error);
    return fallback ? cloneSchedule(fallback) : undefined;
  }
}

/** List every persisted schedule ordered by start time. */
export async function listHuntSchedules(): Promise<HuntSchedule[]> {
  if (!process.env.DATABASE_URL) {
    return Array.from(memoryStore.values()).map(cloneSchedule);
  }

  try {
    const sql = getDb();
    const rows = (await sql`
      SELECT * FROM hunt_schedules ORDER BY start_at ASC
    `) as HuntScheduleRow[];
    const schedules = rows.map(rowToSchedule);
    memoryStore.clear();
    for (const schedule of schedules) memoryStore.set(schedule.huntId, schedule);
    return schedules.map(cloneSchedule);
  } catch (error) {
    logger.warn("Failed to list hunt schedules from database", error);
    return Array.from(memoryStore.values()).map(cloneSchedule);
  }
}

/**
 * List the schedules that need evaluating at `now` (epoch milliseconds):
 * scheduled hunts inside the reminder window, and active hunts at/near their
 * end boundary. Everything else is not due yet.
 */
export async function listDueHuntSchedules(now: number = Date.now()): Promise<HuntSchedule[]> {
  const nowSec = Math.floor(now / 1000);
  const reminderThreshold = nowSec + REMINDER_WINDOW_SECONDS;
  const transitionThreshold = nowSec + TRANSITION_TOLERANCE_SECONDS;

  const isDue = (schedule: HuntSchedule): boolean =>
    (schedule.status === "scheduled" && schedule.startAt <= reminderThreshold) ||
    (schedule.status === "active" &&
      schedule.endAt != null &&
      schedule.endAt <= transitionThreshold);

  const sortByStart = (left: HuntSchedule, right: HuntSchedule) => left.startAt - right.startAt;

  if (!process.env.DATABASE_URL) {
    return Array.from(memoryStore.values()).filter(isDue).sort(sortByStart).map(cloneSchedule);
  }

  try {
    const sql = getDb();
    const rows = (await sql`
      SELECT * FROM hunt_schedules
      WHERE (status = 'scheduled' AND start_at <= ${reminderThreshold})
         OR (status = 'active' AND end_at IS NOT NULL AND end_at <= ${transitionThreshold})
      ORDER BY start_at ASC
    `) as HuntScheduleRow[];
    const schedules = rows.map(rowToSchedule);
    for (const schedule of schedules) memoryStore.set(schedule.huntId, schedule);
    return schedules.map(cloneSchedule);
  } catch (error) {
    logger.warn("Failed to list due hunt schedules from database", error);
    return Array.from(memoryStore.values()).filter(isDue).sort(sortByStart).map(cloneSchedule);
  }
}

/** Insert or update a schedule. Metadata is only overwritten when supplied. */
export async function upsertHuntSchedule(input: UpsertHuntScheduleInput): Promise<HuntSchedule> {
  if (!Number.isFinite(input.huntId)) {
    throw new Error("Hunt schedule requires a numeric hunt id");
  }

  const existing = memoryStore.get(input.huntId);
  const startAtInput = input.startAt ?? existing?.startAt;
  const startAt = toEpochSeconds(startAtInput);
  if (startAt == null) {
    throw new Error("Hunt schedule requires a start time");
  }

  // Moving a hunt to a new start time makes it a fresh schedule: clear the
  // processed marker and let it be reminded again.
  const rescheduled = existing != null && input.startAt != null && startAt !== existing.startAt;

  const schedule: HuntSchedule = {
    huntId: input.huntId,
    title: input.title ?? existing?.title,
    creatorWallet: input.creatorWallet ?? existing?.creatorWallet,
    creatorEmail: input.creatorEmail ?? existing?.creatorEmail,
    startAt,
    endAt: input.endAt == null ? existing?.endAt : toEpochSeconds(input.endAt),
    status: normalizeStatus(input.status ?? (rescheduled ? "scheduled" : existing?.status)),
    processedAt:
      input.processedAt != null
        ? toEpochSeconds(input.processedAt)
        : rescheduled
          ? undefined
          : existing?.processedAt,
    createdAt: existing?.createdAt ?? nowSeconds(),
    updatedAt: nowSeconds(),
  };
  memoryStore.set(schedule.huntId, schedule);

  if (!process.env.DATABASE_URL) return cloneSchedule(schedule);

  try {
    const sql = getDb();
    const [row] = (await sql`
      INSERT INTO hunt_schedules
        (hunt_id, title, creator_wallet, creator_email, start_at, end_at, status, processed_at, updated_at)
      VALUES
        (${schedule.huntId}, ${schedule.title ?? null}, ${schedule.creatorWallet ?? null},
         ${schedule.creatorEmail ?? null}, ${schedule.startAt}, ${schedule.endAt ?? null},
         ${schedule.status}, ${schedule.processedAt ?? null}, NOW())
      ON CONFLICT (hunt_id) DO UPDATE SET
        title = COALESCE(EXCLUDED.title, hunt_schedules.title),
        creator_wallet = COALESCE(EXCLUDED.creator_wallet, hunt_schedules.creator_wallet),
        creator_email = COALESCE(EXCLUDED.creator_email, hunt_schedules.creator_email),
        start_at = EXCLUDED.start_at,
        end_at = EXCLUDED.end_at,
        status = EXCLUDED.status,
        processed_at = EXCLUDED.processed_at,
        updated_at = NOW()
      RETURNING *
    `) as HuntScheduleRow[];
    if (row) {
      const stored = rowToSchedule(row);
      memoryStore.set(stored.huntId, stored);
      return cloneSchedule(stored);
    }
  } catch (error) {
    logger.warn("Failed to persist hunt schedule to database", error);
  }

  return cloneSchedule(schedule);
}

/** Record that a schedule was transitioned and/or that its reminder was sent. */
export async function markHuntScheduleProcessed(
  huntId: number,
  status: HuntScheduleStatus,
  processedAt: number = nowSeconds()
): Promise<void> {
  const timestamp = toEpochSeconds(processedAt) ?? nowSeconds();
  const existing = memoryStore.get(huntId);
  memoryStore.set(huntId, {
    huntId,
    startAt: existing?.startAt ?? 0,
    title: existing?.title,
    creatorWallet: existing?.creatorWallet,
    creatorEmail: existing?.creatorEmail,
    endAt: existing?.endAt,
    createdAt: existing?.createdAt,
    status: normalizeStatus(status),
    processedAt: timestamp,
    updatedAt: nowSeconds(),
  });

  if (!process.env.DATABASE_URL) return;

  try {
    const sql = getDb();
    await sql`
      UPDATE hunt_schedules
      SET status = ${status}, processed_at = ${timestamp}, updated_at = NOW()
      WHERE hunt_id = ${huntId}
    `;
  } catch (error) {
    logger.warn("Failed to mark hunt schedule processed in database", error);
  }
}

/** Reset process-local state in unit tests or during a development reset. */
export function clearHuntScheduleStore(): void {
  memoryStore.clear();
}

export interface HuntScheduleTransition {
  huntId: number;
  from: HuntScheduleStatus;
  to: HuntScheduleStatus;
}

export interface HuntScheduleProcessingResult {
  /** Number of persisted schedules that were due and evaluated. */
  considered: number;
  transitions: HuntScheduleTransition[];
  /** Hunt ids that are inside the reminder window. */
  reminders: number[];
  /** Reminders the sender reported as delivered. */
  sent: number;
}

export interface ProcessHuntSchedulesOptions {
  /** Current time in epoch milliseconds. Defaults to `Date.now()`. */
  now?: number;
  /**
   * Reminder sender. Omit to only compute candidates (valid for dry runs and
   * tests). Wired to `sendHuntStartReminder` by the cron route.
   */
  sendReminder?: (payload: {
    hunt: StoredHunt;
    recipientEmail: string;
    recipientWalletAddress?: string;
    startTime: number;
  }) => Promise<boolean>;
}

/**
 * Materialise a persisted schedule into the shape the pure scheduling
 * functions expect. `huntScheduling.ts` works in epoch milliseconds, while the
 * table stores epoch seconds.
 */
function toStoredHunt(schedule: HuntSchedule): StoredHunt {
  return {
    id: schedule.huntId,
    title: schedule.title ?? `Hunt #${schedule.huntId}`,
    description: "",
    cluesCount: 0,
    status: schedule.status,
    rewardType: "XLM",
    startAt: schedule.startAt * 1000,
    endAt: schedule.endAt != null ? schedule.endAt * 1000 : undefined,
    creator: schedule.creatorWallet,
    creatorEmail: schedule.creatorEmail,
  };
}

/**
 * Re-evaluate every due schedule exactly once per invocation:
 *  1. load due rows from the store,
 *  2. apply `applyHuntScheduleTransitions` and persist changed statuses,
 *  3. compute `getReminderCandidates`, send them, and record `processed_at`.
 *
 * Safe to call concurrently from more than one worker: the state change is
 * idempotent for a given `now`, and reminders are debounced by `processed_at`.
 */
export async function processDueHuntSchedules(
  options: ProcessHuntSchedulesOptions = {}
): Promise<HuntScheduleProcessingResult> {
  const now = options.now ?? Date.now();
  const due = await listDueHuntSchedules(now);

  if (due.length === 0) {
    return { considered: 0, transitions: [], reminders: [], sent: 0 };
  }

  const byId = new Map(due.map((schedule) => [schedule.huntId, schedule]));
  const transitioned = applyHuntScheduleTransitions(due.map(toStoredHunt), now);

  const transitions: HuntScheduleTransition[] = [];
  for (const hunt of transitioned) {
    const previous = byId.get(hunt.id);
    if (!previous) continue;

    const nextStatus = normalizeStatus(hunt.status);
    if (nextStatus !== previous.status) {
      await markHuntScheduleProcessed(hunt.id, nextStatus, Math.floor(now / 1000));
      transitions.push({ huntId: hunt.id, from: previous.status, to: nextStatus });
    }
  }

  // `processed_at` doubles as the "already reminded" marker so a hunt inside
  // the reminder window is not emailed on every scheduler tick. The extra
  // `processedAt == null` filter keeps the reminder to exactly one send for a
  // schedule (re-arming only when `upsertHuntSchedule` sees a new start time).
  const alreadySent: HuntReminderState = new Map(
    due
      .filter((schedule) => schedule.processedAt != null)
      .map((schedule) => [schedule.huntId, (schedule.processedAt as number) * 1000])
  );

  const reminderCandidates = getReminderCandidates(transitioned, now, alreadySent).filter(
    (hunt) => byId.get(hunt.id)?.processedAt == null
  );
  const reminders: number[] = [];
  let sent = 0;

  for (const hunt of reminderCandidates) {
    const schedule = byId.get(hunt.id);
    if (!schedule) continue;

    reminders.push(hunt.id);
    if (!options.sendReminder) continue;

    const recipientEmail = schedule.creatorEmail ?? hunt.creatorEmail;
    const delivered = recipientEmail
      ? await options.sendReminder({
          hunt,
          recipientEmail,
          recipientWalletAddress: hunt.creator,
          startTime: schedule.startAt,
        })
      : false;

    if (delivered) {
      sent += 1;
      await markHuntScheduleProcessed(hunt.id, schedule.status, Math.floor(now / 1000));
    }
  }

  return { considered: due.length, transitions, reminders, sent };
}
