import { useEffect, useState } from "react"
import { useReducedMotion } from "framer-motion"
import confetti from "canvas-confetti"
import { toast } from "sonner"
import { ACHIEVEMENTS } from "@/lib/achievements/config"
import { checkAndAwardAchievements } from "@/lib/achievements/service"
import { logger } from "@/lib/logger"
import { awardXpFromHunt, getLevelTierForXp, getPlayerLevel } from "@/lib/level"
import { getPlayerAttempts } from "@/lib/huntAttemptHistory"
import type { HuntAttemptRecord } from "@/lib/types"

export function useGameCompleteEffects(
  isOpen: boolean,
  playerAddress?: string,
  huntId?: number,
  reward?: number
) {
  const prefersReducedMotion = useReducedMotion()
  const [newAchievements, setNewAchievements] = useState<string[]>([])
  const [levelUpData, setLevelUpData] = useState<{
    oldLevel: number
    newLevel: number
    oldTier: ReturnType<typeof getLevelTierForXp>
    newTier: ReturnType<typeof getLevelTierForXp>
  } | null>(null)
  const [isLevelUpModalOpen, setIsLevelUpModalOpen] = useState(false)
  const [latestAttempt, setLatestAttempt] = useState<HuntAttemptRecord | null>(null)

  useEffect(() => {
    if (!isOpen) return

    if (!prefersReducedMotion) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } })
    }

    if (playerAddress && huntId) {
      const attempts = getPlayerAttempts(playerAddress)
      const match = attempts.find((a) => a.huntId === huntId) ?? null
      setLatestAttempt(match)
    }

    if (playerAddress && reward !== undefined) {
      try {
        const earned = checkAndAwardAchievements(playerAddress, {
          totalHuntsCompleted: 1,
          totalHuntsWon: 1,
          totalNftsEarned: 0,
          fastestCompletionSeconds: undefined,
        })
        if (earned.length > 0) {
          setNewAchievements(earned)
          earned.forEach((achievementId) => {
            const achievement = ACHIEVEMENTS[achievementId as keyof typeof ACHIEVEMENTS]
            if (achievement) {
              toast.success(`🎉 Achievement Unlocked: ${achievement.title}!`, {
                description: achievement.description,
                duration: 5000,
              })
            }
          })
        }
      } catch (error) {
        logger.error("Failed to check achievements:", error)
      }

      try {
        const oldLevelData = getPlayerLevel(playerAddress)
        const oldTier = getLevelTierForXp(oldLevelData.totalXp)
        const { xpEarned, levelUpOccurred } = awardXpFromHunt(playerAddress, reward)

        if (levelUpOccurred) {
          const newLevelData = getPlayerLevel(playerAddress)
          const newTier = getLevelTierForXp(newLevelData.totalXp)
          setLevelUpData({
            oldLevel: oldTier.level,
            newLevel: newTier.level,
            oldTier,
            newTier,
          })
          setIsLevelUpModalOpen(true)
        }

        toast.success(`✨ +${xpEarned} XP earned!`, { duration: 3000 })
      } catch (error) {
        logger.error("Failed to award XP:", error)
      }
    }
  }, [isOpen, playerAddress, huntId, prefersReducedMotion, reward])

  return {
    newAchievements,
    levelUpData,
    isLevelUpModalOpen,
    setIsLevelUpModalOpen,
    latestAttempt,
  }
}
