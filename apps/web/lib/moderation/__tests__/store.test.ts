import { describe, it, expect, vi, beforeEach } from "vitest"
import { createMockSql, resetTables, type Row } from "@/lib/test-utils/mockSql"

// ---------------------------------------------------------------------------
// In-memory table store — shared across all queries in a single test.
// ---------------------------------------------------------------------------

const tables: Record<string, Row[]> = {
  moderation_submissions: [],
  moderation_notifications: [],
}

const mockSql = createMockSql(tables)

vi.mock("@/lib/db", () => ({
  getDb: () => mockSql,
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}))

vi.mock("@/lib/moderation/autoFlag", () => ({
  scanHuntContent: (hunt: { title: string; description: string; rewardPool: number }) => {
    const autoFlags: string[] = []
    const policyViolations: string[] = []
    if ((hunt.description?.length ?? 0) < 20) autoFlags.push("short_description" as never)
    if (hunt.rewardPool > 100) autoFlags.push("reward_anomaly" as never)
    return { autoFlags, policyViolations }
  },
}))

import {
  submitHuntForModeration,
  getPendingSubmissions,
  getAllSubmissions,
  approveSubmission,
  rejectSubmission,
  getCreatorNotifications,
  getModerationStatusForHunts,
} from "@/lib/moderation/dbStore"
import { createHunt } from "@/lib/test-utils/factories"

describe("moderation dbStore", () => {
  beforeEach(() => {
    resetTables(tables)
  })

  it("queues hunt submissions with auto flags", async () => {
    const hunt = createHunt({
      id: 42,
      title: "CASINO BONUS QUEST",
      description: "Short",
      rewardPool: 50,
    })
    const submission = await submitHuntForModeration(hunt)
    expect(submission.status).toBe("pending")
    expect(submission.autoFlags.length).toBeGreaterThan(0)
    expect(await getPendingSubmissions()).toHaveLength(1)
  })

  it("approves and notifies creator", async () => {
    const hunt = createHunt({ id: 7, creatorEmail: "creator@example.com" })
    const submission = await submitHuntForModeration(hunt)
    const approved = await approveSubmission(submission.id)
    expect(approved?.status).toBe("approved")
    expect((await getPendingSubmissions()).length).toBe(0)
    const notifications = await getCreatorNotifications("creator@example.com")
    expect(notifications.some((n) => n.action === "approved")).toBe(true)
  })

  it("rejects with reason and notifies creator", async () => {
    const hunt = createHunt({ id: 8, creatorEmail: "creator@example.com" })
    const submission = await submitHuntForModeration(hunt)
    const rejected = await rejectSubmission(submission.id, "Misleading reward copy", ["misleading"])
    expect(rejected?.status).toBe("rejected")
    expect(rejected?.rejectionReason).toBe("Misleading reward copy")
    const notifications = await getCreatorNotifications("creator@example.com")
    expect(notifications.some((n) => n.action === "rejected" && n.reason?.includes("Misleading"))).toBe(
      true
    )
  })

  it("persists moderation decisions across re-queries (simulates restart)", async () => {
    const hunt = createHunt({ id: 99, creatorEmail: "test@example.com" })
    const submission = await submitHuntForModeration(hunt)

    // Approve the submission
    await approveSubmission(submission.id)

    // Simulate a "restart" by re-querying — data persists via database
    const pending = await getPendingSubmissions()
    expect(pending).toHaveLength(0)

    const all = await getAllSubmissions()
    expect(all).toHaveLength(1)
    expect(all[0].status).toBe("approved")
    expect(all[0].reviewedAt).toBeDefined()
  })

  it("getModerationStatusForHunts returns latest status per hunt", async () => {
    const hunt1 = createHunt({ id: 10 })
    const hunt2 = createHunt({ id: 20 })
    const sub1 = await submitHuntForModeration(hunt1)
    await submitHuntForModeration(hunt2)
    await approveSubmission(sub1.id)

    const statuses = await getModerationStatusForHunts([10, 20])
    expect(statuses[10]?.status).toBe("approved")
    expect(statuses[20]?.status).toBe("pending")
  })
})
