/**
 * Level service for managing player XP and levels.
 * Handles level logic and storage.
 */

import { logger } from "@/lib/logger"

import { calculateXpFromHunt, LEVEL_TIERS, type LevelTier, type LevelTitle } from "./config"

export interface PlayerLevelData {
  address: string
  totalXp: number
  currentLevel: number
  currentTitle: LevelTitle
  lastUpdated: number
}

/**
 * Storage key for player level data in localStorage
 */
const getStorageKey = (address: string): string => `hunty_level_${address}`

/**
 * Get level tier for a given XP amount
 */
export function getLevelTierForXp(xp: number): LevelTier {
  let tier = LEVEL_TIERS[0]
  for (const t of LEVEL_TIERS) {
    if (xp >= t.xpRequired) {
      tier = t
    } else {
      break
    }
  }
  return tier
}

/**
 * Get XP progress towards next level
 */
export function getXpProgress(xp: number): { current: number; required: number; percentage: number } {
  const currentTier = getLevelTierForXp(xp)
  const nextTierIndex = LEVEL_TIERS.findIndex((t) => t.level === currentTier.level) + 1
  const nextTier = LEVEL_TIERS[nextTierIndex]

  if (!nextTier) {
    return {
      current: xp,
      required: xp,
      percentage: 100,
    }
  }

  const xpInCurrentLevel = xp - currentTier.xpRequired
  const xpNeededForNext = nextTier.xpRequired - currentTier.xpRequired
  const percentage = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNext) * 100))

  return {
    current: xpInCurrentLevel,
    required: xpNeededForNext,
    percentage,
  }
}

/**
 * Get player level data
 */
export function getPlayerLevel(address: string): PlayerLevelData {
  if (typeof window === "undefined") {
    return {
      address,
      totalXp: 0,
      currentLevel: 1,
      currentTitle: "Beginner",
      lastUpdated: Date.now(),
    }
  }

  try {
    const stored = localStorage.getItem(getStorageKey(address))
    if (!stored) {
      return {
        address,
        totalXp: 0,
        currentLevel: 1,
        currentTitle: "Beginner",
        lastUpdated: Date.now(),
      }
    }
    return JSON.parse(stored) as PlayerLevelData
  } catch (error) {
    logger.error("Failed to load level data:", error)
    return {
      address,
      totalXp: 0,
      currentLevel: 1,
      currentTitle: "Beginner",
      lastUpdated: Date.now(),
    }
  }
}

/**
 * Add XP to player and check for level up
 * Returns true if level up occurred
 */
export function addXpToPlayer(address: string, xpToAdd: number): boolean {
  if (typeof window === "undefined") return false

  try {
    const currentData = getPlayerLevel(address)
    const oldTier = getLevelTierForXp(currentData.totalXp)
    const newTotalXp = currentData.totalXp + xpToAdd
    const newTier = getLevelTierForXp(newTotalXp)

    const levelUpOccurred = newTier.level > oldTier.level

    const newData: PlayerLevelData = {
      address,
      totalXp: newTotalXp,
      currentLevel: newTier.level,
      currentTitle: newTier.title,
      lastUpdated: Date.now(),
    }

    localStorage.setItem(getStorageKey(address), JSON.stringify(newData))
    return levelUpOccurred
  } catch (error) {
    logger.error("Failed to add XP:", error)
    return false
  }
}

/**
 * Award XP from hunt completion
 * Returns true if level up occurred
 */
export function awardXpFromHunt(
  address: string,
  points: number,
  difficulty?: string
): { xpEarned: number; levelUpOccurred: boolean } {
  const xpEarned = calculateXpFromHunt(points, difficulty)
  const levelUpOccurred = addXpToPlayer(address, xpEarned)
  return { xpEarned, levelUpOccurred }
}

/**
 * Clear player level data (for testing)
 */
export function clearPlayerLevel(address: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(getStorageKey(address))
  } catch (error) {
    logger.error("Failed to clear level data:", error)
  }
}
