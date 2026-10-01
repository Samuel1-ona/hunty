/**
 * @vitest-environment node
 */

import { describe, expect, it, vi } from "vitest"
import {
  notificationPreferencesResponseSchema,
  referralLeaderboardResponseSchema,
  tagsGetResponseSchema,
  tagsPostResponseSchema,
} from "@hunty/types/api-schemas"

vi.mock("@/lib/rate-limit", () => ({
  getIP: () => "127.0.0.1",
  rateLimit: async () => ({ success: true, reset: 0 }),
  rateLimitResponse: () => new Response("rate limited", { status: 429 }),
}))

vi.mock("@/lib/huntStore", () => ({
  getAllHunts: () => [
    { tags: ["city", "history"] },
    { tags: ["city", "night"] },
  ],
}))

vi.mock("@/lib/tags", () => ({
  normalizeTag: (value: string) => value.trim().toLowerCase(),
  autocompleteTags: () => ["city", "history"],
  suggestTagsFromContent: () => ["night"],
}))

vi.mock("@/lib/categories", () => ({
  isHuntCategoryId: () => true,
}))

vi.mock("@/lib/notifications/notificationPreferencesStore", () => ({
  getStoredNotificationPreferences: vi.fn(async () => ({
    enabled: true,
    huntEvents: true,
    rewards: true,
    social: true,
    achievements: true,
    rankImproved: true,
    rankDropped: true,
    overtaken: true,
    weeklyDigest: true,
    threshold: 1,
    pushEnabled: false,
    pushHuntStart: true,
    pushOvertake: true,
    pushHuntCancelled: true,
    pushPlayerRegistered: true,
    pushFirstCompletion: true,
  })),
  saveNotificationPreferences: vi.fn(async () => ({
    enabled: false,
    huntEvents: true,
    rewards: true,
    social: true,
    achievements: true,
    rankImproved: true,
    rankDropped: true,
    overtaken: true,
    weeklyDigest: true,
    threshold: 2,
    pushEnabled: true,
    pushHuntStart: true,
    pushOvertake: true,
    pushHuntCancelled: true,
    pushPlayerRegistered: true,
    pushFirstCompletion: true,
  })),
}))

vi.mock("@/lib/referralStore", () => ({
  getReferralLeaderboard: () => [
    {
      rank: 1,
      referrerAddress: "GREFERRER1",
      successfulReferrals: 4,
      totalInvites: 6,
      bonusPoints: 100,
      lastActiveAt: Date.now() - 1000,
      rewardPayoutStatus: "pending",
      rewardAmount: 25,
    },
  ],
  getReferralLeaderboardStats: () => ({
    totalReferrers: 1,
    totalSuccessfulReferrals: 4,
    totalBonusDistributed: 100,
    activeRewardPool: 500,
  }),
  getReferrerRank: () => ({
    rank: 1,
    referrerAddress: "GREFERRER1",
    successfulReferrals: 4,
    totalInvites: 6,
    bonusPoints: 100,
    lastActiveAt: Date.now() - 1000,
    rewardPayoutStatus: "pending",
    rewardAmount: 25,
  }),
}))

describe("API response contract against route handlers", () => {
  it("parses /api/v1/tags GET response with tagsGetResponseSchema", async () => {
    const route = await import("@/app/api/v1/tags/route")
    const response = await route.GET(
      new Request("http://localhost/api/v1/tags?q=ci&title=city&description=history"),
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    const parsed = tagsGetResponseSchema.parse(payload)
    expect(parsed.corpusSize).toBeGreaterThanOrEqual(0)
  })

  it("parses /api/v1/tags POST response with tagsPostResponseSchema", async () => {
    const route = await import("@/app/api/v1/tags/route")
    const response = await route.POST(
      new Request("http://localhost/api/v1/tags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category: "city", tags: ["City", " Night "] }),
      }),
      {},
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    const parsed = tagsPostResponseSchema.parse(payload)
    expect(parsed.ok).toBe(true)
  })

  it("parses /api/v1/notifications/preferences GET+PUT responses with notification schema", async () => {
    const route = await import("@/app/api/v1/notifications/preferences/route")

    const getResponse = await route.GET(
      new Request("http://localhost/api/v1/notifications/preferences?walletAddress=GA123"),
      {},
    )
    expect(getResponse.status).toBe(200)
    notificationPreferencesResponseSchema.parse(await getResponse.json())

    const putResponse = await route.PUT(
      new Request("http://localhost/api/v1/notifications/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          walletAddress: "GA123",
          preferences: { enabled: false, threshold: 2, pushEnabled: true },
        }),
      }),
      {},
    )
    expect(putResponse.status).toBe(200)
    notificationPreferencesResponseSchema.parse(await putResponse.json())
  })

  it("parses /api/v1/referrals/leaderboard GET response with referral schema", async () => {
    const route = await import("@/app/api/v1/referrals/leaderboard/route")
    const response = await route.GET(
      new Request("http://localhost/api/v1/referrals/leaderboard?period=week&limit=10&address=GREFERRER1"),
      {},
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    const parsed = referralLeaderboardResponseSchema.parse(payload)
    expect(parsed.period).toBe("week")
  })
})
