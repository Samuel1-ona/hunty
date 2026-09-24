import { describe, expect, it } from "vitest"
import type { StoredHunt } from "@/lib/types"
import {
  applyHuntScheduleTransitions,
  getReminderCandidates,
  validateHuntSchedule,
} from "@/lib/huntScheduling"

describe("hunt scheduling", () => {
  it("rejects invalid schedule ranges and past starts", () => {
    const now = new Date("2026-07-25T12:00:00.000Z").getTime()
    const result = validateHuntSchedule({
      startAt: now - 60_000,
      endAt: now - 30_000,
      now,
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual(
      expect.objectContaining({
        startAt: expect.stringContaining("future"),
        endAt: expect.stringContaining("after"),
      })
    )
  })

  it("transitions scheduled hunts to active and active hunts to ended at the boundary", () => {
    const now = new Date("2026-07-25T12:00:00.000Z").getTime()
    const hunts: StoredHunt[] = [
      {
        id: 1,
        title: "Scheduled",
        description: "",
        cluesCount: 1,
        status: "scheduled",
        rewardType: "XLM",
        startAt: now - 60_000,
        endAt: now + 60_000,
      } as StoredHunt,
      {
        id: 2,
        title: "Active",
        description: "",
        cluesCount: 1,
        status: "active",
        rewardType: "XLM",
        startAt: now - 120_000,
        endAt: now - 30_000,
      } as StoredHunt,
      {
        id: 3,
        title: "Already ended",
        description: "",
        cluesCount: 1,
        status: "ended",
        rewardType: "XLM",
        startAt: now - 5 * 60_000,
        endAt: now - 60_000,
      } as StoredHunt,
    ]

    const updated = applyHuntScheduleTransitions(hunts, now)

    expect(updated.find((hunt) => hunt.id === 1)?.status).toBe("active")
    expect(updated.find((hunt) => hunt.id === 2)?.status).toBe("ended")
    expect(updated.find((hunt) => hunt.id === 3)?.status).toBe("ended")
  })

  it("only sends reminder notifications once within the reminder window", () => {
    const now = new Date("2026-07-25T12:00:00.000Z").getTime()
    const hunts: StoredHunt[] = [
      {
        id: 1,
        title: "Reminder",
        description: "",
        cluesCount: 1,
        status: "scheduled",
        rewardType: "XLM",
        startAt: now + 30 * 60_000,
        endAt: now + 2 * 60 * 60_000,
      } as StoredHunt,
    ]

    const first = getReminderCandidates(hunts, now, new Map([[1, now - 5 * 60_000]]))
    const second = getReminderCandidates(hunts, now, new Map([[1, now]]))

    expect(first).toHaveLength(1)
    expect(second).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// huntScheduling – translated messages
// ---------------------------------------------------------------------------
describe("hunt scheduling – translated messages", () => {
  const now = new Date("2026-07-25T12:00:00.000Z").getTime()

  it("uses supplied translated error message for past start time", () => {
    const result = validateHuntSchedule({
      startAt: now - 60_000,
      endAt: now + 60_000,
      now,
      messages: {
        startMustBeFuture: "La hora de inicio debe estar en el futuro.",
        endMustBeAfterStart: "La hora de fin debe ser posterior a la de inicio.",
        endMustBeAfterNow: "La hora de fin debe ser posterior a la hora actual.",
      },
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.startAt).toBe("La hora de inicio debe estar en el futuro.")
  })

  it("uses supplied translated message for end before start", () => {
    const result = validateHuntSchedule({
      startAt: now + 120_000,
      endAt: now + 60_000,
      now,
      messages: {
        startMustBeFuture: "Start ok",
        endMustBeAfterStart: "L'heure de fin doit être postérieure à l'heure de début.",
        endMustBeAfterNow: "End after now",
      },
    })
    expect(result.errors.endAt).toBe("L'heure de fin doit être postérieure à l'heure de début.")
  })

  it("still falls back to English defaults when messages not supplied", () => {
    const result = validateHuntSchedule({
      startAt: now - 60_000,
      endAt: now - 30_000,
      now,
    })
    expect(result.errors.startAt).toContain("future")
  })
})

// ---------------------------------------------------------------------------
// huntScheduling – DST boundary
// ---------------------------------------------------------------------------
describe("hunt scheduling – DST boundary", () => {
  /**
   * The validation tolerances and reminder windows are expressed in ms and
   * always computed against Date.now() (or a mocked equivalent), which is a
   * UTC millisecond counter. Clocks jumping forward/back in a local timezone
   * has no effect on the arithmetic — this test confirms the validation result
   * is stable across the US spring-forward moment (2026-03-08T07:00:00Z).
   */
  it("validates correctly across US spring-forward DST boundary", () => {
    // 1 second after the spring-forward transition
    const springForwardMs = new Date("2026-03-08T07:00:01Z").getTime()

    // A hunt scheduled 10 minutes from now, ending 2 hours later — valid.
    const startAt = springForwardMs + 10 * 60_000
    const endAt = springForwardMs + 2 * 60 * 60_000

    const result = validateHuntSchedule({ startAt, endAt, now: springForwardMs })
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it("validates correctly across US fall-back DST boundary", () => {
    // 1 second after the fall-back transition (2026-11-01T06:00:01Z)
    const fallBackMs = new Date("2026-11-01T06:00:01Z").getTime()

    const startAt = fallBackMs + 10 * 60_000
    const endAt = fallBackMs + 2 * 60 * 60_000

    const result = validateHuntSchedule({ startAt, endAt, now: fallBackMs })
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
  })
})

