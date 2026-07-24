/**
 * Tests for the achievement service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  getEarnedAchievements,
  hasAchievement,
  awardAchievement,
  checkAndAwardAchievements,
  getAllAchievementsWithStatus,
  clearAchievements,
} from "./service"

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
})

describe("Achievement Service", () => {
  const testAddress = "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF3LGYXJJAB7REVOLYTSM"

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe("getEarnedAchievements", () => {
    it("should return empty array when no achievements are earned", () => {
      const earned = getEarnedAchievements(testAddress)
      expect(earned).toEqual([])
    })

    it("should return earned achievements for a player", () => {
      awardAchievement(testAddress, "first_hunt_completed")
      awardAchievement(testAddress, "first_win")

      const earned = getEarnedAchievements(testAddress)
      expect(earned).toHaveLength(2)
      expect(earned.map((a) => a.id)).toContain("first_hunt_completed")
      expect(earned.map((a) => a.id)).toContain("first_win")
    })

    it("should handle corrupted localStorage data gracefully", () => {
      localStorage.setItem("hunty_achievements_test", "invalid json")
      const earned = getEarnedAchievements("test")
      expect(earned).toEqual([])
    })
  })

  describe("hasAchievement", () => {
    it("should return false when achievement is not earned", () => {
      const has = hasAchievement(testAddress, "first_hunt_completed")
      expect(has).toBe(false)
    })

    it("should return true when achievement is earned", () => {
      awardAchievement(testAddress, "first_hunt_completed")
      const has = hasAchievement(testAddress, "first_hunt_completed")
      expect(has).toBe(true)
    })

    it("should return false for different achievements", () => {
      awardAchievement(testAddress, "first_hunt_completed")
      const has = hasAchievement(testAddress, "first_win")
      expect(has).toBe(false)
    })
  })

  describe("awardAchievement", () => {
    it("should award a new achievement", () => {
      const result = awardAchievement(testAddress, "first_hunt_completed")
      expect(result).toBe(true)
      expect(hasAchievement(testAddress, "first_hunt_completed")).toBe(true)
    })

    it("should not award the same achievement twice", () => {
      awardAchievement(testAddress, "first_hunt_completed")
      const result = awardAchievement(testAddress, "first_hunt_completed")
      expect(result).toBe(false)

      const earned = getEarnedAchievements(testAddress)
      expect(earned).toHaveLength(1)
    })

    it("should store achievement with timestamp", () => {
      const before = Date.now()
      awardAchievement(testAddress, "first_hunt_completed")
      const after = Date.now()

      const earned = getEarnedAchievements(testAddress)
      expect(earned[0].earnedAt).toBeGreaterThanOrEqual(before)
      expect(earned[0].earnedAt).toBeLessThanOrEqual(after)
    })

    it("should award multiple different achievements", () => {
      awardAchievement(testAddress, "first_hunt_completed")
      awardAchievement(testAddress, "first_win")
      awardAchievement(testAddress, "five_wins")

      const earned = getEarnedAchievements(testAddress)
      expect(earned).toHaveLength(3)
    })
  })

  describe("checkAndAwardAchievements", () => {
    it("should award first_hunt_completed when totalHuntsCompleted >= 1", () => {
      const newAchievements = checkAndAwardAchievements(testAddress, {
        totalHuntsCompleted: 1,
        totalHuntsWon: 0,
        totalNftsEarned: 0,
      })

      expect(newAchievements).toContain("first_hunt_completed")
      expect(hasAchievement(testAddress, "first_hunt_completed")).toBe(true)
    })

    it("should award first_win when totalHuntsWon >= 1", () => {
      const newAchievements = checkAndAwardAchievements(testAddress, {
        totalHuntsCompleted: 1,
        totalHuntsWon: 1,
        totalNftsEarned: 0,
      })

      expect(newAchievements).toContain("first_win")
      expect(hasAchievement(testAddress, "first_win")).toBe(true)
    })

    it("should award five_wins when totalHuntsWon >= 5", () => {
      const newAchievements = checkAndAwardAchievements(testAddress, {
        totalHuntsCompleted: 5,
        totalHuntsWon: 5,
        totalNftsEarned: 0,
      })

      expect(newAchievements).toContain("five_wins")
      expect(hasAchievement(testAddress, "five_wins")).toBe(true)
    })

    it("should award ten_wins when totalHuntsWon >= 10", () => {
      const newAchievements = checkAndAwardAchievements(testAddress, {
        totalHuntsCompleted: 10,
        totalHuntsWon: 10,
        totalNftsEarned: 0,
      })

      expect(newAchievements).toContain("ten_wins")
      expect(hasAchievement(testAddress, "ten_wins")).toBe(true)
    })

    it("should award twenty_five_wins when totalHuntsWon >= 25", () => {
      const newAchievements = checkAndAwardAchievements(testAddress, {
        totalHuntsCompleted: 25,
        totalHuntsWon: 25,
        totalNftsEarned: 0,
      })

      expect(newAchievements).toContain("twenty_five_wins")
      expect(hasAchievement(testAddress, "twenty_five_wins")).toBe(true)
    })

    it("should award first_nft when totalNftsEarned >= 1", () => {
      const newAchievements = checkAndAwardAchievements(testAddress, {
        totalHuntsCompleted: 1,
        totalHuntsWon: 1,
        totalNftsEarned: 1,
      })

      expect(newAchievements).toContain("first_nft")
      expect(hasAchievement(testAddress, "first_nft")).toBe(true)
    })

    it("should award speed_hunter when fastestCompletionSeconds <= 300", () => {
      const newAchievements = checkAndAwardAchievements(testAddress, {
        totalHuntsCompleted: 1,
        totalHuntsWon: 1,
        totalNftsEarned: 0,
        fastestCompletionSeconds: 250,
      })

      expect(newAchievements).toContain("speed_hunter")
      expect(hasAchievement(testAddress, "speed_hunter")).toBe(true)
    })

    it("should not award speed_hunter when fastestCompletionSeconds > 300", () => {
      const newAchievements = checkAndAwardAchievements(testAddress, {
        totalHuntsCompleted: 1,
        totalHuntsWon: 1,
        totalNftsEarned: 0,
        fastestCompletionSeconds: 350,
      })

      expect(newAchievements).not.toContain("speed_hunter")
      expect(hasAchievement(testAddress, "speed_hunter")).toBe(false)
    })

    it("should award veteran when totalHuntsCompleted >= 50", () => {
      const newAchievements = checkAndAwardAchievements(testAddress, {
        totalHuntsCompleted: 50,
        totalHuntsWon: 25,
        totalNftsEarned: 0,
      })

      expect(newAchievements).toContain("veteran")
      expect(hasAchievement(testAddress, "veteran")).toBe(true)
    })

    it("should award legend when totalHuntsWon >= 100", () => {
      const newAchievements = checkAndAwardAchievements(testAddress, {
        totalHuntsCompleted: 100,
        totalHuntsWon: 100,
        totalNftsEarned: 0,
      })

      expect(newAchievements).toContain("legend")
      expect(hasAchievement(testAddress, "legend")).toBe(true)
    })

    it("should not re-award already earned achievements", () => {
      checkAndAwardAchievements(testAddress, {
        totalHuntsCompleted: 1,
        totalHuntsWon: 1,
        totalNftsEarned: 0,
      })

      const newAchievements = checkAndAwardAchievements(testAddress, {
        totalHuntsCompleted: 2,
        totalHuntsWon: 2,
        totalNftsEarned: 0,
      })

      expect(newAchievements).not.toContain("first_hunt_completed")
      expect(newAchievements).not.toContain("first_win")
    })

    it("should award multiple achievements in one call", () => {
      const newAchievements = checkAndAwardAchievements(testAddress, {
        totalHuntsCompleted: 5,
        totalHuntsWon: 5,
        totalNftsEarned: 1,
      })

      expect(newAchievements).toContain("first_hunt_completed")
      expect(newAchievements).toContain("first_win")
      expect(newAchievements).toContain("five_wins")
      expect(newAchievements).toContain("first_nft")
    })

    it("should return empty array when no new achievements are earned", () => {
      checkAndAwardAchievements(testAddress, {
        totalHuntsCompleted: 1,
        totalHuntsWon: 1,
        totalNftsEarned: 0,
      })

      const newAchievements = checkAndAwardAchievements(testAddress, {
        totalHuntsCompleted: 1,
        totalHuntsWon: 1,
        totalNftsEarned: 0,
      })

      expect(newAchievements).toEqual([])
    })
  })

  describe("getAllAchievementsWithStatus", () => {
    it("should return all achievements with earned status", () => {
      awardAchievement(testAddress, "first_hunt_completed")

      const all = getAllAchievementsWithStatus(testAddress)
      expect(all).toHaveLength(10)

      const firstHunt = all.find((a) => a.id === "first_hunt_completed")
      expect(firstHunt?.earned).toBe(true)

      const firstWin = all.find((a) => a.id === "first_win")
      expect(firstWin?.earned).toBe(false)
    })

    it("should include earnedAt timestamp for earned achievements", () => {
      awardAchievement(testAddress, "first_hunt_completed")

      const all = getAllAchievementsWithStatus(testAddress)
      const firstHunt = all.find((a) => a.id === "first_hunt_completed")

      expect(firstHunt?.earnedAt).toBeDefined()
      expect(typeof firstHunt?.earnedAt).toBe("number")
    })

    it("should not include earnedAt for unearned achievements", () => {
      const all = getAllAchievementsWithStatus(testAddress)
      const firstWin = all.find((a) => a.id === "first_win")

      expect(firstWin?.earnedAt).toBeUndefined()
    })
  })

  describe("clearAchievements", () => {
    it("should clear all achievements for a player", () => {
      awardAchievement(testAddress, "first_hunt_completed")
      awardAchievement(testAddress, "first_win")

      clearAchievements(testAddress)

      const earned = getEarnedAchievements(testAddress)
      expect(earned).toEqual([])
    })

    it("should not affect other players' achievements", () => {
      const otherAddress = "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF3LGYXJJAB7REVOLYTSN"

      awardAchievement(testAddress, "first_hunt_completed")
      awardAchievement(otherAddress, "first_win")

      clearAchievements(testAddress)

      expect(getEarnedAchievements(testAddress)).toEqual([])
      expect(getEarnedAchievements(otherAddress)).toHaveLength(1)
    })
  })
})
