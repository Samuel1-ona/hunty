import { describe, expect, it } from "vitest"
import type { StoredHunt } from "@/lib/types"
import {
  applyHuntScheduleTransitions,
  getReminderCandidates,
  getRecurringOccurrenceWindow,
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

  it("creates weekly and month-end occurrence windows", () => {
    const startAt = new Date("2026-01-31T10:00:00.000Z").getTime()
    const endAt = new Date("2026-01-31T11:00:00.000Z").getTime()

    expect(getRecurringOccurrenceWindow({ startAt, endAt, frequency: "weekly", interval: 1 })).toEqual({
      startAt: new Date("2026-02-07T10:00:00.000Z").getTime(),
      endAt: new Date("2026-02-07T11:00:00.000Z").getTime(),
    })
    expect(getRecurringOccurrenceWindow({ startAt, endAt, frequency: "monthly", interval: 1 })).toEqual({
      startAt: new Date("2026-02-28T10:00:00.000Z").getTime(),
      endAt: new Date("2026-02-28T11:00:00.000Z").getTime(),
    })
  })
})
