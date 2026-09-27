/**
 * Achievement service for checking and awarding achievements.
 * Handles achievement logic and storage.
 */

import type { AchievementId } from "./config"
import { ACHIEVEMENTS } from "./config"
import { logger } from "@/lib/logger"

export interface EarnedAchievement {
  id: AchievementId
  earnedAt: number // Unix timestamp
}

export interface PlayerAchievements {
  address: string
  earned: EarnedAchievement[]
  lastUpdated: number
}

/**
 * Storage key for player achievements in localStorage
 */
const getStorageKey = (address: string): string => `hunty_achievements_${address}`

/**
 * Get all earned achievements for a player
 */
export function getEarnedAchievements(address: string): EarnedAchievement[] {
  if (typeof window === "undefined") return []

  try {
    const stored = localStorage.getItem(getStorageKey(address))
    if (!stored) return []
    const data = JSON.parse(stored) as PlayerAchievements
    return data.earned || []
  } catch (error) {
    logger.error("Failed to load achievements:", error)
    return []
  }
}

/**
 * Check if a player has earned a specific achievement
 */
export function hasAchievement(address: string, achievementId: AchievementId): boolean {
  const earned = getEarnedAchievements(address)
  return earned.some((a) => a.id === achievementId)
}

/**
 * Award an achievement to a player
 */
export function awardAchievement(address: string, achievementId: AchievementId): boolean {
  if (typeof window === "undefined") return false

  // Check if already earned
  if (hasAchievement(address, achievementId)) {
    return false
  }

  try {
    const key = getStorageKey(address)
    const stored = localStorage.getItem(key)
    let data: PlayerAchievements

    if (stored) {
      data = JSON.parse(stored) as PlayerAchievements
    } else {
      data = {
        address,
        earned: [],
        lastUpdated: Date.now(),
      }
    }

    data.earned.push({
      id: achievementId,
      earnedAt: Date.now(),
    })
    data.lastUpdated = Date.now()

    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (error) {
    logger.error("Failed to award achievement:", error)
    return false
  }
}

/**
 * Check and award achievements based on player stats
 * Returns newly earned achievements
 */
export function checkAndAwardAchievements(
  address: string,
  stats: {
    totalHuntsCompleted: number
    totalHuntsWon: number
    totalNftsEarned: number
    fastestCompletionSeconds?: number
    monthlyHighScore?: number
  }
): AchievementId[] {
  const newAchievements: AchievementId[] = []

  // First hunt completed
  if (stats.totalHuntsCompleted >= 1 && !hasAchievement(address, "first_hunt_completed")) {
    if (awardAchievement(address, "first_hunt_completed")) {
      newAchievements.push("first_hunt_completed")
    }
  }

  // First win
  if (stats.totalHuntsWon >= 1 && !hasAchievement(address, "first_win")) {
    if (awardAchievement(address, "first_win")) {
      newAchievements.push("first_win")
    }
  }

  // Five wins
  if (stats.totalHuntsWon >= 5 && !hasAchievement(address, "five_wins")) {
    if (awardAchievement(address, "five_wins")) {
      newAchievements.push("five_wins")
    }
  }

  // Ten wins
  if (stats.totalHuntsWon >= 10 && !hasAchievement(address, "ten_wins")) {
    if (awardAchievement(address, "ten_wins")) {
      newAchievements.push("ten_wins")
    }
  }

  // Twenty-five wins
  if (stats.totalHuntsWon >= 25 && !hasAchievement(address, "twenty_five_wins")) {
    if (awardAchievement(address, "twenty_five_wins")) {
      newAchievements.push("twenty_five_wins")
    }
  }

  // First NFT
  if (stats.totalNftsEarned >= 1 && !hasAchievement(address, "first_nft")) {
    if (awardAchievement(address, "first_nft")) {
      newAchievements.push("first_nft")
    }
  }

  // Speed hunter (under 5 minutes = 300 seconds)
  if (
    stats.fastestCompletionSeconds !== undefined &&
    stats.fastestCompletionSeconds <= 300 &&
    !hasAchievement(address, "speed_hunter")
  ) {
    if (awardAchievement(address, "speed_hunter")) {
      newAchievements.push("speed_hunter")
    }
  }

  // Veteran (50 hunts completed)
  if (stats.totalHuntsCompleted >= 50 && !hasAchievement(address, "veteran")) {
    if (awardAchievement(address, "veteran")) {
      newAchievements.push("veteran")
    }
  }

  // Legend (100 wins)
  if (stats.totalHuntsWon >= 100 && !hasAchievement(address, "legend")) {
    if (awardAchievement(address, "legend")) {
      newAchievements.push("legend")
    }
  }

  // High scorer (monthly top score) - this would need additional context
  // For now, we'll skip this as it requires leaderboard data
  // if (stats.monthlyHighScore !== undefined && !hasAchievement(address, "high_scorer")) {
  //   if (awardAchievement(address, "high_scorer")) {
  //     newAchievements.push("high_scorer")
  //   }
  // }

  return newAchievements
}

/**
 * Get all achievements with earned status for a player
 */
export function getAllAchievementsWithStatus(address: string) {
  const earned = getEarnedAchievements(address)
  const earnedIds = new Set(earned.map((a) => a.id))

  return Object.values(ACHIEVEMENTS).map((achievement) => ({
    ...achievement,
    earned: earnedIds.has(achievement.id),
    earnedAt: earned.find((a) => a.id === achievement.id)?.earnedAt,
  }))
}

/**
 * Clear all achievements for a player (for testing)
 */
export function clearAchievements(address: string): void {
  if (typeof window === "undefined") return

  try {
    localStorage.removeItem(getStorageKey(address))
  } catch (error) {
    logger.error("Failed to clear achievements:", error)
  }
}
