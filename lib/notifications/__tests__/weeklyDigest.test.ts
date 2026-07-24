import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getLastDigestTimestamp,
  setLastDigestTimestamp,
  generateWeeklyDigest,
  shouldSendWeeklyDigest,
  createWeeklyDigestNotification,
} from "../weeklyDigest"
import { saveNotifications, getStoredNotifications } from "../rankTracker"

describe("weeklyDigest", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("getLastDigestTimestamp / setLastDigestTimestamp", () => {
    it("returns 0 when no digest has been sent", () => {
      expect(getLastDigestTimestamp()).toBe(0)
    })

    it("persists and retrieves the last digest timestamp", () => {
      const now = Date.now()
      setLastDigestTimestamp(now)
      expect(getLastDigestTimestamp()).toBe(now)
    })
  })

  describe("shouldSendWeeklyDigest", () => {
    it("returns true when no digest has ever been sent", () => {
      expect(shouldSendWeeklyDigest()).toBe(true)
    })

    it("returns false when digest was sent less than a week ago", () => {
      setLastDigestTimestamp(Date.now())
      expect(shouldSendWeeklyDigest()).toBe(false)
    })

    it("returns true when digest was sent more than a week ago", () => {
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
      setLastDigestTimestamp(eightDaysAgo)
      expect(shouldSendWeeklyDigest()).toBe(true)
    })
  })

  describe("generateWeeklyDigest", () => {
    it("returns null when there are no notifications", () => {
      expect(generateWeeklyDigest()).toBeNull()
    })

    it("returns null when all notifications are older than a week", () => {
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000
      saveNotifications([
        {
          id: "old-1",
          type: "rank_improved",
          huntId: 1,
          huntTitle: "Old Hunt",
          previousRank: 5,
          currentRank: 3,
          timestamp: twoWeeksAgo,
          read: false,
        },
      ])
      expect(generateWeeklyDigest()).toBeNull()
    })

    it("generates digest from recent notifications", () => {
      saveNotifications([
        {
          id: "recent-1",
          type: "rank_improved",
          huntId: 1,
          huntTitle: "Test Hunt",
          previousRank: 5,
          currentRank: 3,
          timestamp: Date.now() - 86400000,
          read: false,
        },
        {
          id: "recent-2",
          type: "rank_dropped",
          huntId: 1,
          huntTitle: "Test Hunt",
          previousRank: 3,
          currentRank: 4,
          timestamp: Date.now() - 43200000,
          read: false,
        },
      ])

      const digest = generateWeeklyDigest()
      expect(digest).not.toBeNull()
      expect(digest!.entries.length).toBe(1)
      expect(digest!.entries[0].totalChanges).toBe(2)
      expect(digest!.entries[0].improvements).toBe(1)
      expect(digest!.entries[0].drops).toBe(1)
    })

    it("tracks best and worst ranks", () => {
      saveNotifications([
        {
          id: "r1",
          type: "rank_improved",
          huntId: 1,
          huntTitle: "Test Hunt",
          previousRank: 10,
          currentRank: 8,
          timestamp: Date.now() - 86400000,
          read: false,
        },
        {
          id: "r2",
          type: "rank_improved",
          huntId: 1,
          huntTitle: "Test Hunt",
          previousRank: 8,
          currentRank: 5,
          timestamp: Date.now() - 43200000,
          read: false,
        },
        {
          id: "r3",
          type: "rank_dropped",
          huntId: 1,
          huntTitle: "Test Hunt",
          previousRank: 5,
          currentRank: 7,
          timestamp: Date.now() - 21600000,
          read: false,
        },
      ])

      const digest = generateWeeklyDigest()
      expect(digest!.entries[0].bestRank).toBe(5)
      expect(digest!.entries[0].worstRank).toBe(10)
      expect(digest!.entries[0].currentRank).toBe(7)
    })
  })

  describe("createWeeklyDigestNotification", () => {
    it("returns null when there are no notifications", () => {
      expect(createWeeklyDigestNotification()).toBeNull()
    })

    it("creates a digest notification and updates timestamp", () => {
      saveNotifications([
        {
          id: "recent-1",
          type: "rank_improved",
          huntId: 1,
          huntTitle: "Test Hunt",
          previousRank: 5,
          currentRank: 3,
          timestamp: Date.now() - 86400000,
          read: false,
        },
      ])

      const result = createWeeklyDigestNotification()
      expect(result).not.toBeNull()
      expect(result).toContain("weekly rank summary")

      const allNotifs = getStoredNotifications()
      expect(allNotifs.some((n) => n.id.startsWith("weekly-digest-"))).toBe(true)
    })

    it("does not create duplicate digest notifications", () => {
      saveNotifications([
        {
          id: "recent-1",
          type: "rank_improved",
          huntId: 1,
          huntTitle: "Test Hunt",
          previousRank: 5,
          currentRank: 3,
          timestamp: Date.now() - 86400000,
          read: false,
        },
      ])

      createWeeklyDigestNotification()
      const result2 = createWeeklyDigestNotification()
      expect(result2).toBeNull()
    })
  })
})
