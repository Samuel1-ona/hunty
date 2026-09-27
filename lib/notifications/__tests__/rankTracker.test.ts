import { beforeEach, describe, expect, it } from "vitest"
import {
  detectRankChanges,
  getStoredNotifications,
  storeSnapshot,
  getStoredSnapshot,
  saveNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
  getUnreadNotificationCount,
} from "../rankTracker"
import type { LeaderboardEntry } from "@/lib/types"

describe("rankTracker", () => {
  const mockHuntId = 1
  const mockHuntTitle = "Test Hunt"
  const mockAddress = "GABC...1234"
  const mockEntries: LeaderboardEntry[] = [
    { address: "GABC...1234", name: "Player One", points: 100 },
    { address: "GDEF...5678", name: "Player Two", points: 85 },
    { address: "GHIJ...9012", name: "Player Three", points: 70 },
  ]

  beforeEach(() => {
    localStorage.clear()
  })

  describe("detectRankChanges", () => {
    it("returns empty notifications on first call (no previous snapshot)", () => {
      const result = detectRankChanges(mockHuntId, mockHuntTitle, mockAddress, mockEntries)
      expect(result).toEqual([])
    })

    it("detects rank improvement", () => {
      const initialEntries: LeaderboardEntry[] = [
        { address: "GDEF...5678", name: "Player Two", points: 100 },
        { address: "GABC...1234", name: "Player One", points: 85 },
        { address: "GHIJ...9012", name: "Player Three", points: 70 },
      ]
      detectRankChanges(mockHuntId, mockHuntTitle, mockAddress, initialEntries)

      // Player moves up from rank 2 to rank 1
      const updatedEntries: LeaderboardEntry[] = [
        { address: "GABC...1234", name: "Player One", points: 110 },
        { address: "GDEF...5678", name: "Player Two", points: 100 },
        { address: "GHIJ...9012", name: "Player Three", points: 70 },
      ]

      const result = detectRankChanges(mockHuntId, mockHuntTitle, mockAddress, updatedEntries)
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result[0].type).toBe("rank_improved")
      expect(result[0].huntId).toBe(mockHuntId)
      expect(result[0].previousRank).toBe(2)
      expect(result[0].currentRank).toBe(1)
    })

    it("detects rank drop", () => {
      detectRankChanges(mockHuntId, mockHuntTitle, mockAddress, mockEntries)

      const updatedEntries: LeaderboardEntry[] = [
        { address: "GDEF...5678", name: "Player Two", points: 110 },
        { address: "GABC...1234", name: "Player One", points: 80 },
        { address: "GHIJ...9012", name: "Player Three", points: 70 },
      ]

      const result = detectRankChanges(mockHuntId, mockHuntTitle, mockAddress, updatedEntries)
      expect(result.length).toBeGreaterThanOrEqual(1)
      const dropped = result.filter((n) => n.type === "rank_dropped")
      expect(dropped.length).toBeGreaterThanOrEqual(1)
      expect(dropped[0].previousRank).toBe(1)
      expect(dropped[0].currentRank).toBe(2)
    })

    it("detects being overtaken", () => {
      detectRankChanges(mockHuntId, mockHuntTitle, mockAddress, mockEntries)

      const updatedEntries: LeaderboardEntry[] = [
        { address: "GDEF...5678", name: "Player Two", points: 110 },
        { address: "GHIJ...9012", name: "Player Three", points: 105 },
        { address: "GABC...1234", name: "Player One", points: 100 },
      ]

      const result = detectRankChanges(mockHuntId, mockHuntTitle, mockAddress, updatedEntries)
      const overtaken = result.filter((n) => n.type === "overtaken")
      expect(overtaken.length).toBeGreaterThanOrEqual(2)
    })

    it("handles player not in leaderboard", () => {
      const result = detectRankChanges(mockHuntId, mockHuntTitle, "UNKNOWN", mockEntries)
      expect(result).toEqual([])
    })

    it("stores snapshot after detection", () => {
      detectRankChanges(mockHuntId, mockHuntTitle, mockAddress, mockEntries)
      const snapshot = getStoredSnapshot(mockHuntId)
      expect(snapshot).not.toBeNull()
      expect(snapshot!.huntId).toBe(mockHuntId)
    })

    it("returns no notifications when rank is unchanged", () => {
      detectRankChanges(mockHuntId, mockHuntTitle, mockAddress, mockEntries)

      const result = detectRankChanges(mockHuntId, mockHuntTitle, mockAddress, mockEntries)
      const changes = result.filter(
        (n) => n.type === "rank_improved" || n.type === "rank_dropped"
      )
      expect(changes).toEqual([])
    })
  })

  describe("notification storage", () => {
    it("saves and retrieves notifications", () => {
      const mockNotif = {
        id: "test-1",
        type: "rank_improved" as const,
        huntId: 1,
        huntTitle: "Test",
        previousRank: 3,
        currentRank: 2,
        timestamp: Date.now(),
        read: false,
      }

      saveNotifications([mockNotif])
      const stored = getStoredNotifications()
      expect(stored.length).toBe(1)
      expect(stored[0].id).toBe("test-1")
    })

    it("marks notification as read", () => {
      const mockNotif = {
        id: "test-1",
        type: "rank_improved" as const,
        huntId: 1,
        huntTitle: "Test",
        previousRank: 3,
        currentRank: 2,
        timestamp: Date.now(),
        read: false,
      }

      saveNotifications([mockNotif])
      markNotificationRead("test-1")

      const stored = getStoredNotifications()
      expect(stored[0].read).toBe(true)
    })

    it("marks all notifications as read", () => {
      saveNotifications([
        {
          id: "test-1",
          type: "rank_improved" as const,
          huntId: 1,
          huntTitle: "Test",
          previousRank: 3,
          currentRank: 2,
          timestamp: Date.now(),
          read: false,
        },
        {
          id: "test-2",
          type: "rank_dropped" as const,
          huntId: 1,
          huntTitle: "Test",
          previousRank: 2,
          currentRank: 3,
          timestamp: Date.now(),
          read: false,
        },
      ])

      markAllNotificationsRead()
      const stored = getStoredNotifications()
      expect(stored.every((n) => n.read)).toBe(true)
    })

    it("clears all notifications", () => {
      saveNotifications([
        {
          id: "test-1",
          type: "rank_improved" as const,
          huntId: 1,
          huntTitle: "Test",
          previousRank: 3,
          currentRank: 2,
          timestamp: Date.now(),
          read: false,
        },
      ])

      clearNotifications()
      expect(getStoredNotifications()).toEqual([])
    })

    it("returns unread count", () => {
      saveNotifications([
        {
          id: "test-1",
          type: "rank_improved" as const,
          huntId: 1,
          huntTitle: "Test",
          previousRank: 3,
          currentRank: 2,
          timestamp: Date.now(),
          read: false,
        },
        {
          id: "test-2",
          type: "rank_dropped" as const,
          huntId: 1,
          huntTitle: "Test",
          previousRank: 2,
          currentRank: 3,
          timestamp: Date.now(),
          read: true,
        },
      ])

      expect(getUnreadNotificationCount()).toBe(1)
    })

    it("deduplicates notifications on save", () => {
      const mockNotif = {
        id: "test-1",
        type: "rank_improved" as const,
        huntId: 1,
        huntTitle: "Test",
        previousRank: 3,
        currentRank: 2,
        timestamp: Date.now(),
        read: false,
      }

      saveNotifications([mockNotif])
      saveNotifications([mockNotif])

      expect(getStoredNotifications().length).toBe(1)
    })
  })

  describe("storeSnapshot / getStoredSnapshot", () => {
    it("stores and retrieves a rank snapshot", () => {
      storeSnapshot(mockHuntId, mockHuntTitle, [
        { address: "GABC...1234", rank: 1, points: 100, name: "Player One" },
        { address: "GDEF...5678", rank: 2, points: 85, name: "Player Two" },
      ])

      const snapshot = getStoredSnapshot(mockHuntId)
      expect(snapshot).not.toBeNull()
      expect(snapshot!.entries.length).toBe(2)
      expect(snapshot!.huntTitle).toBe(mockHuntTitle)
    })

    it("returns null for missing snapshot", () => {
      expect(getStoredSnapshot(999)).toBeNull()
    })
  })
})
