import type { StoredHunt } from "@/lib/types"

// ---------------------------------------------------------------------------
// Scheduling messages (i18n-aware)
// ---------------------------------------------------------------------------

/**
 * Validation error strings used by `validateHuntSchedule`.
 * Pass strings from `next-intl` to get localized errors; omit for English defaults.
 */
export interface SchedulingMessages {
  startMustBeFuture: string
  endMustBeAfterStart: string
  endMustBeAfterNow: string
}

const DEFAULT_SCHEDULING_MESSAGES: SchedulingMessages = {
  startMustBeFuture: "Start time must be in the future.",
  endMustBeAfterStart: "End time must be after the start time.",
  endMustBeAfterNow: "End time must be after the current time.",
}

export type HuntScheduleValidationResult = {
  isValid: boolean
  errors: Partial<Record<"startAt" | "endAt", string>>
}

export type HuntReminderState = Map<number, number>

const REMINDER_WINDOWS_MS = [24 * 60 * 60 * 1000, 60 * 60 * 1000]
const TRANSITION_TOLERANCE_MS = 60 * 1000
const VALIDATION_TOLERANCE_MS = 5 * 1000

export function validateHuntSchedule({
  startAt,
  endAt,
  now = Date.now(),
  messages,
}: {
  startAt: number
  endAt: number
  now?: number
  /** Optional locale-translated error strings. Falls back to English when omitted. */
  messages?: SchedulingMessages
}): HuntScheduleValidationResult {
  const msgs = messages ?? DEFAULT_SCHEDULING_MESSAGES
  const errors: Partial<Record<"startAt" | "endAt", string>> = {}

  if (startAt < now - VALIDATION_TOLERANCE_MS) {
    errors.startAt = msgs.startMustBeFuture
  }

  if (endAt <= startAt) {
    errors.endAt = msgs.endMustBeAfterStart
  } else if (endAt < now - VALIDATION_TOLERANCE_MS) {
    errors.endAt = msgs.endMustBeAfterNow
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export function applyHuntScheduleTransitions(hunts: StoredHunt[], now = Date.now()): StoredHunt[] {
  return hunts.map((hunt) => {
    const status = hunt.status?.toLowerCase()
    const startAt = hunt.startAt
    const endAt = hunt.endAt

    if (status === "scheduled" && startAt != null && startAt <= now + TRANSITION_TOLERANCE_MS) {
      return { ...hunt, status: "active" as StoredHunt["status"] }
    }

    if (status === "active" && endAt != null && endAt <= now + TRANSITION_TOLERANCE_MS) {
      return { ...hunt, status: "ended" as StoredHunt["status"] }
    }

    return hunt
  })
}

export function getReminderCandidates(
  hunts: StoredHunt[],
  now = Date.now(),
  alreadySent: HuntReminderState = new Map()
): StoredHunt[] {
  return hunts.filter((hunt) => {
    const status = hunt.status?.toLowerCase()
    const startAt = hunt.startAt
    if (status !== "scheduled" || startAt == null) return false

    const diff = startAt - now
    if (diff < 0 || diff > REMINDER_WINDOWS_MS[0]) return false

    const shouldSend = REMINDER_WINDOWS_MS.some((window) => diff <= window)
    if (!shouldSend) return false

    const lastSentAt = alreadySent.get(hunt.id)
    return lastSentAt == null || lastSentAt < now - TRANSITION_TOLERANCE_MS
  })
}
