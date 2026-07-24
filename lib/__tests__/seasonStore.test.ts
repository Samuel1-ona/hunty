/**
 * Tests for seasonStore
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  getAllSeasons,
  getActiveSeason,
  getSeasonById,
  createSeason,
  updateSeasonStatus,
  archiveSeason,
  getArchivedSeasons,
  getArchivedSeasonById,
  awardSeasonBadge,
  getPlayerSeasonBadges,
  getAllSeasonBadges,
  getCurrentSeasonLeaderboard,
  checkSeasonReset,
  getSeasonTimeRemaining,
} from "@/lib/seasonStore"

describe("seasonStore", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof window !== "undefined") {
      localStorage.clear()
    }
  })

  afterEach(() => {
    // Clear localStorage after each test
    if (typeof window !== "undefined") {
      localStorage.clear()
    }
  })

  describe("getAllSeasons", () => {
    it("should return seed seasons when localStorage is empty", () => {
      const seasons = getAllSeasons()
      expect(seasons).toHaveLength(2)
      expect(seasons[0].name).toBe("Season 1: Genesis")
      expect(seasons[1].name).toBe("Season 2: Rising Stars")
    })

    it("should return seasons from localStorage when available", () => {
      if (typeof window === "undefined") return
      
      const customSeason = {
        id: 3,
        name: "Custom Season",
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + 86400,
        status: "Upcoming" as const,
      }
      localStorage.setItem("hunty_seasons", JSON.stringify([customSeason]))
      
      const seasons = getAllSeasons()
      expect(seasons).toHaveLength(1)
      expect(seasons[0].name).toBe("Custom Season")
    })
  })

  describe("getActiveSeason", () => {
    it("should return the active season when one exists", () => {
      const now = Math.floor(Date.now() / 1000)
      const activeSeason = getActiveSeason()
      
      expect(activeSeason).not.toBeNull()
      expect(activeSeason?.status).toBe("Active")
      expect(activeSeason?.startTime).toBeLessThanOrEqual(now)
      expect(activeSeason?.endTime).toBeGreaterThanOrEqual(now)
    })

    it("should return null when no active season exists", () => {
      if (typeof window === "undefined") return
      
      // Set all seasons to ended
      const seasons = getAllSeasons().map((s) => ({ ...s, status: "Ended" as const }))
      localStorage.setItem("hunty_seasons", JSON.stringify(seasons))
      
      const activeSeason = getActiveSeason()
      expect(activeSeason).toBeNull()
    })
  })

  describe("getSeasonById", () => {
    it("should return the correct season by ID", () => {
      const season = getSeasonById(1)
      expect(season).toBeDefined()
      expect(season?.id).toBe(1)
      expect(season?.name).toBe("Season 1: Genesis")
    })

    it("should return undefined for non-existent season", () => {
      const season = getSeasonById(999)
      expect(season).toBeUndefined()
    })
  })

  describe("createSeason", () => {
    it("should create a new season with auto-incremented ID", () => {
      if (typeof window === "undefined") return
      
      const newSeason = createSeason({
        name: "Season 3: New Era",
        startTime: Math.floor(Date.now() / 1000) + 86400,
        endTime: Math.floor(Date.now() / 1000) + 86400 * 30,
        status: "Upcoming",
      })
      
      expect(newSeason.id).toBe(3)
      expect(newSeason.name).toBe("Season 3: New Era")
      
      const allSeasons = getAllSeasons()
      expect(allSeasons).toHaveLength(3)
    })
  })

  describe("updateSeasonStatus", () => {
    it("should update the status of a season", () => {
      if (typeof window === "undefined") return
      
      updateSeasonStatus(2, "Ended")
      const season = getSeasonById(2)
      expect(season?.status).toBe("Ended")
    })
  })

  describe("archiveSeason", () => {
    it("should archive a season with final leaderboard", () => {
      if (typeof window === "undefined") return
      
      const finalLeaderboard = [
        { address: "GABC...123", name: "Player1", points: 100 },
        { address: "GDEF...456", name: "Player2", points: 80 },
      ]
      
      const archived = archiveSeason(2, finalLeaderboard)
      
      expect(archived.season.id).toBe(2)
      expect(archived.season.status).toBe("Ended")
      expect(archived.finalLeaderboard).toHaveLength(2)
      expect(archived.finalLeaderboard[0].rank).toBe(1)
      expect(archived.finalLeaderboard[1].rank).toBe(2)
      
      const archivedSeasons = getArchivedSeasons()
      expect(archivedSeasons).toHaveLength(1)
    })

    it("should throw error when archiving non-existent season", () => {
      if (typeof window === "undefined") return
      
      expect(() => {
        archiveSeason(999, [])
      }).toThrow("Season 999 not found")
    })
  })

  describe("getArchivedSeasons", () => {
    it("should return empty array when no seasons are archived", () => {
      const archived = getArchivedSeasons()
      expect(archived).toHaveLength(0)
    })

    it("should return archived seasons", () => {
      if (typeof window === "undefined") return
      
      const finalLeaderboard = [{ address: "GABC...123", points: 100 }]
      archiveSeason(1, finalLeaderboard)
      
      const archived = getArchivedSeasons()
      expect(archived).toHaveLength(1)
    })
  })

  describe("getArchivedSeasonById", () => {
    it("should return archived season by ID", () => {
      if (typeof window === "undefined") return
      
      const finalLeaderboard = [{ address: "GABC...123", points: 100 }]
      archiveSeason(1, finalLeaderboard)
      
      const archived = getArchivedSeasonById(1)
      expect(archived).toBeDefined()
      expect(archived?.season.id).toBe(1)
    })

    it("should return undefined for non-existent archived season", () => {
      const archived = getArchivedSeasonById(999)
      expect(archived).toBeUndefined()
    })
  })

  describe("awardSeasonBadge", () => {
    it("should award a season badge to a player", () => {
      if (typeof window === "undefined") return
      
      const badge = awardSeasonBadge(1, "GABC...123", "Player1", 1)
      
      expect(badge.seasonId).toBe(1)
      expect(badge.address).toBe("GABC...123")
      expect(badge.name).toBe("Player1")
      expect(badge.rank).toBe(1)
      
      const badges = getAllSeasonBadges()
      expect(badges).toHaveLength(1)
    })

    it("should update existing badge with rank", () => {
      if (typeof window === "undefined") return
      
      awardSeasonBadge(1, "GABC...123", "Player1")
      const updatedBadge = awardSeasonBadge(1, "GABC...123", "Player1", 1)
      
      expect(updatedBadge.rank).toBe(1)
      
      const badges = getAllSeasonBadges()
      expect(badges).toHaveLength(1)
    })
  })

  describe("getPlayerSeasonBadges", () => {
    it("should return badges for a specific player", () => {
      if (typeof window === "undefined") return
      
      awardSeasonBadge(1, "GABC...123", "Player1", 1)
      awardSeasonBadge(2, "GABC...123", "Player1", 2)
      awardSeasonBadge(1, "GDEF...456", "Player2", 3)
      
      const badges = getPlayerSeasonBadges("GABC...123")
      expect(badges).toHaveLength(2)
      expect(badges.every((b) => b.address === "GABC...123")).toBe(true)
    })

    it("should return empty array for player with no badges", () => {
      const badges = getPlayerSeasonBadges("GABC...123")
      expect(badges).toHaveLength(0)
    })
  })

  describe("getAllSeasonBadges", () => {
    it("should return all season badges", () => {
      if (typeof window === "undefined") return
      
      awardSeasonBadge(1, "GABC...123", "Player1", 1)
      awardSeasonBadge(2, "GDEF...456", "Player2", 2)
      
      const badges = getAllSeasonBadges()
      expect(badges).toHaveLength(2)
    })
  })

  describe("getCurrentSeasonLeaderboard", () => {
    it("should return mock leaderboard data", () => {
      const leaderboard = getCurrentSeasonLeaderboard()
      expect(Array.isArray(leaderboard)).toBe(true)
      expect(leaderboard.length).toBeGreaterThan(0)
      expect(leaderboard[0]).toHaveProperty("address")
      expect(leaderboard[0]).toHaveProperty("points")
    })

    it("should return empty array when no active season", () => {
      if (typeof window === "undefined") return
      
      const seasons = getAllSeasons().map((s) => ({ ...s, status: "Ended" as const }))
      localStorage.setItem("hunty_seasons", JSON.stringify(seasons))
      
      const leaderboard = getCurrentSeasonLeaderboard()
      expect(leaderboard).toHaveLength(0)
    })
  })

  describe("checkSeasonReset", () => {
    it("should return null when no season needs reset", () => {
      const season = checkSeasonReset()
      expect(season).toBeNull()
    })

    it("should return season that needs reset (ended but still active)", () => {
      if (typeof window === "undefined") return
      
      const now = Math.floor(Date.now() / 1000)
      const expiredSeason = {
        id: 3,
        name: "Expired Season",
        startTime: now - 86400,
        endTime: now - 3600,
        status: "Active" as const,
      }
      localStorage.setItem("hunty_seasons", JSON.stringify([expiredSeason]))
      
      const season = checkSeasonReset()
      expect(season).not.toBeNull()
      expect(season?.id).toBe(3)
    })
  })

  describe("getSeasonTimeRemaining", () => {
    it("should return time remaining for active season", () => {
      const season = getActiveSeason()
      if (!season) return
      
      const timeRemaining = getSeasonTimeRemaining(season.id)
      expect(timeRemaining).toBeGreaterThanOrEqual(0)
      expect(timeRemaining).toBeLessThanOrEqual(season.endTime - season.startTime)
    })

    it("should return 0 for ended season", () => {
      const timeRemaining = getSeasonTimeRemaining(1)
      expect(timeRemaining).toBe(0)
    })

    it("should return 0 for non-existent season", () => {
      const timeRemaining = getSeasonTimeRemaining(999)
      expect(timeRemaining).toBe(0)
    })
  })
})
