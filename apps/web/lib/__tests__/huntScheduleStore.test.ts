import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

import { POST as cronPOST } from "@/app/api/cron/hunt-schedules/route"
import { sendHuntStartReminder } from "@/lib/notifications/huntScheduleNotifications"
import {
  clearHuntScheduleStore,
  getHuntSchedule,
  listDueHuntSchedules,
  listHuntSchedules,
  markHuntScheduleProcessed,
  processDueHuntSchedules,
  upsertHuntSchedule,
} from "@/lib/huntScheduleStore"

vi.mock("@/lib/notifications/huntScheduleNotifications", () => ({
  sendHuntStartReminder: vi.fn().mockResolvedValue(true),
}))

const NOW_MS = new Date("2026-07-25T12:00:00.000Z").getTime()
const NOW_SEC = Math.floor(NOW_MS / 1000)
const CRON_URL = "http://localhost:3000/api/cron/hunt-schedules"

const originalDatabaseUrl = process.env.DATABASE_URL
const originalCronSecret = process.env.CRON_SECRET

beforeEach(() => {
  // Force the in-memory fallback so the tests never touch PostgreSQL.
  delete process.env.DATABASE_URL
  process.env.CRON_SECRET = "test-cron-secret"
  clearHuntScheduleStore()
  vi.clearAllMocks()
})

afterEach(() => {
  clearHuntScheduleStore()
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = originalDatabaseUrl
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = originalCronSecret
})

describe("huntScheduleStore (in-memory fallback)", () => {
  it("upserts and reads a schedule without DATABASE_URL", async () => {
    await upsertHuntSchedule({
      huntId: 7,
      title: "City Secrets",
      creatorEmail: "creator@example.com",
      startAt: NOW_SEC + 3600,
      endAt: NOW_SEC + 7200,
    })

    const stored = await getHuntSchedule(7)
    expect(stored).toMatchObject({
      huntId: 7,
      title: "City Secrets",
      creatorEmail: "creator@example.com",
      startAt: NOW_SEC + 3600,
      endAt: NOW_SEC + 7200,
      status: "scheduled",
    })
  })

  it("updates in place on a second upsert and keeps the existing start time", async () => {
    await upsertHuntSchedule({ huntId: 7, startAt: NOW_SEC + 3600 })
    await upsertHuntSchedule({ huntId: 7, status: "active" })

    const schedules = await listHuntSchedules()
    expect(schedules).toHaveLength(1)
    expect(schedules[0]).toMatchObject({
      huntId: 7,
      startAt: NOW_SEC + 3600,
      status: "active",
    })
  })

  it("rejects a schedule without a hunt id or start time", async () => {
    await expect(
      upsertHuntSchedule({ huntId: Number.NaN, startAt: NOW_SEC + 60 })
    ).rejects.toThrow(/hunt id/i)
    await expect(upsertHuntSchedule({ huntId: 8 })).rejects.toThrow(/start time/i)
  })

  it("lists only schedules that are due for a transition or a reminder", async () => {
    await upsertHuntSchedule({ huntId: 1, startAt: NOW_SEC + 30 })
    await upsertHuntSchedule({ huntId: 2, startAt: NOW_SEC + 1800 })
    await upsertHuntSchedule({ huntId: 3, startAt: NOW_SEC + 48 * 3600 })
    await upsertHuntSchedule({
      huntId: 4,
      startAt: NOW_SEC - 3600,
      endAt: NOW_SEC - 10,
      status: "active",
    })
    await upsertHuntSchedule({
      huntId: 5,
      startAt: NOW_SEC - 7200,
      endAt: NOW_SEC - 3600,
      status: "ended",
    })

    const due = await listDueHuntSchedules(NOW_MS)
    expect(due.map((schedule) => schedule.huntId).sort((a, b) => a - b)).toEqual([1, 2, 4])
  })

  it("marks a schedule processed without changing its start time", async () => {
    await upsertHuntSchedule({ huntId: 9, startAt: NOW_SEC + 1800 })
    await markHuntScheduleProcessed(9, "scheduled", NOW_SEC)

    const stored = await getHuntSchedule(9)
    expect(stored?.processedAt).toBe(NOW_SEC)
    expect(stored?.status).toBe("scheduled")
    expect(stored?.startAt).toBe(NOW_SEC + 1800)
  })

  it("re-arms a rescheduled hunt by clearing the processed marker", async () => {
    await upsertHuntSchedule({ huntId: 10, startAt: NOW_SEC + 1800 })
    await markHuntScheduleProcessed(10, "scheduled", NOW_SEC)
    expect((await getHuntSchedule(10))?.processedAt).toBe(NOW_SEC)

    await upsertHuntSchedule({ huntId: 10, startAt: NOW_SEC + 5400 })

    const stored = await getHuntSchedule(10)
    expect(stored?.startAt).toBe(NOW_SEC + 5400)
    expect(stored?.processedAt).toBeUndefined()
    expect(stored?.status).toBe("scheduled")
  })
})

describe("processDueHuntSchedules", () => {
  it("applies scheduled -> active and active -> ended transitions and persists them", async () => {
    await upsertHuntSchedule({ huntId: 1, startAt: NOW_SEC - 10, endAt: NOW_SEC + 3600 })
    await upsertHuntSchedule({
      huntId: 2,
      startAt: NOW_SEC - 7200,
      endAt: NOW_SEC - 10,
      status: "active",
    })

    const result = await processDueHuntSchedules({ now: NOW_MS })

    expect(result.considered).toBe(2)
    expect(result.transitions).toEqual(
      expect.arrayContaining([
        { huntId: 1, from: "scheduled", to: "active" },
        { huntId: 2, from: "active", to: "ended" },
      ])
    )
    expect((await getHuntSchedule(1))?.status).toBe("active")
    expect((await getHuntSchedule(2))?.status).toBe("ended")
  })

  it("leaves schedules that are not due untouched", async () => {
    await upsertHuntSchedule({ huntId: 3, startAt: NOW_SEC + 48 * 3600 })

    const result = await processDueHuntSchedules({ now: NOW_MS })

    expect(result).toEqual({ considered: 0, transitions: [], reminders: [], sent: 0 })
    expect((await getHuntSchedule(3))?.status).toBe("scheduled")
  })

  it("sends a start reminder once and debounces it via processed_at", async () => {
    const sendReminder = vi.fn().mockResolvedValue(true)
    await upsertHuntSchedule({
      huntId: 4,
      title: "Reminder",
      creatorWallet: "GCREATOR0000000000000000000000000000000000000000000000",
      creatorEmail: "creator@example.com",
      startAt: NOW_SEC + 1800,
      endAt: NOW_SEC + 7200,
    })

    const first = await processDueHuntSchedules({ now: NOW_MS, sendReminder })
    expect(first.reminders).toEqual([4])
    expect(first.sent).toBe(1)
    expect(sendReminder).toHaveBeenCalledTimes(1)
    expect(sendReminder.mock.calls[0][0]).toMatchObject({
      recipientEmail: "creator@example.com",
      startTime: NOW_SEC + 1800,
    })
    expect((await getHuntSchedule(4))?.processedAt).toBe(NOW_SEC)

    // Even well past the 60s transition tolerance the marker keeps it silent.
    const second = await processDueHuntSchedules({ now: NOW_MS + 10 * 60_000, sendReminder })
    expect(second.reminders).toEqual([])
    expect(second.sent).toBe(0)
    expect(sendReminder).toHaveBeenCalledTimes(1)
  })

  it("reports a reminder candidate but does not send when there is no creator email", async () => {
    const sendReminder = vi.fn().mockResolvedValue(true)
    await upsertHuntSchedule({ huntId: 5, startAt: NOW_SEC + 1800 })

    const result = await processDueHuntSchedules({ now: NOW_MS, sendReminder })

    expect(result.reminders).toEqual([5])
    expect(result.sent).toBe(0)
    expect(sendReminder).not.toHaveBeenCalled()
  })
})

describe("POST /api/cron/hunt-schedules", () => {
  it("returns 401 when the bearer token is missing", async () => {
    const request = new NextRequest(CRON_URL, { method: "POST" })
    const response = await cronPOST(request)
    expect(response.status).toBe(401)
  })

  it("returns 401 when the bearer token is wrong", async () => {
    const request = new NextRequest(CRON_URL, {
      method: "POST",
      headers: { Authorization: "Bearer not-the-secret" },
    })
    const response = await cronPOST(request)
    expect(response.status).toBe(401)
    expect(sendHuntStartReminder).not.toHaveBeenCalled()
  })

  it("fails closed with 401 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET
    const request = new NextRequest(CRON_URL, {
      method: "POST",
      headers: { Authorization: "Bearer anything" },
    })
    const response = await cronPOST(request)
    expect(response.status).toBe(401)
  })

  it("runs the worker and returns a summary for the correct cron secret", async () => {
    await upsertHuntSchedule({ huntId: 6, startAt: NOW_SEC - 10, endAt: NOW_SEC + 3600 })

    const request = new NextRequest(CRON_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    const response = await cronPOST(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(data.transitions).toEqual([{ huntId: 6, from: "scheduled", to: "active" }])
    expect((await getHuntSchedule(6))?.status).toBe("active")
  })
})
