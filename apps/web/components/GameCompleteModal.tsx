"use client"

import { useEffect, useState } from "react"
import { useReducedMotion } from "framer-motion"
import confetti from "canvas-confetti"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RewardsPanel } from "@/components/RewardsPanel"
import { NftMintProgress } from "@/components/NftMintProgress"
import { LevelUpModal } from "./LevelUpModal"
import { useQuery } from "@tanstack/react-query"
import { checkRegistrationStatus } from "@/lib/contracts/player-registration"
import { SOROBAN_READ_STALE_TIME_MS } from "@/lib/soroban/queryConfig"
import { toast } from "sonner"
import { ACHIEVEMENTS } from "@/lib/achievements/config"
import { checkAndAwardAchievements } from "@/lib/achievements/service"
import { logger } from "@/lib/logger"
import type { HuntAttemptRecord, RewardReceipt } from "@/lib/types"
import { queryCachePolicy, queryKeys } from "@/lib/queryKeys"
import { awardXpFromHunt, getLevelTierForXp, getPlayerLevel } from "@/lib/level"
import { getPlayerAttempts } from "@/lib/huntAttemptHistory"

import { GameCompleteStats } from "./GameCompleteStats"
import { GameCompleteAchievements } from "./GameCompleteAchievements"
import { GameCompleteShare } from "./GameCompleteShare"
import { GameCompleteReview } from "./GameCompleteReview"
import { GameCompleteActions } from "./GameCompleteActions"

interface GameCompleteModalProps {
  isOpen: boolean
  onClose: () => void
  onGoHome: () => void
  onReplay: () => void
  onViewLeaderboard: () => void
  reward: number
  rewardReceipt?: RewardReceipt | null
  huntId?: number
  playerAddress?: string
}

export function GameCompleteModal({
  isOpen,
  onClose,
  onGoHome,
  onReplay,
  onViewLeaderboard,
  reward,
  rewardReceipt,
  huntId,
  playerAddress,
}: GameCompleteModalProps) {
  const prefersReducedMotion = useReducedMotion()
  const [newAchievements, setNewAchievements] = useState<string[]>([])
  const [levelUpData, setLevelUpData] = useState<{
    oldLevel: number
    newLevel: number
    oldTier: ReturnType<typeof getLevelTierForXp>
    newTier: ReturnType<typeof getLevelTierForXp>
  } | null>(null)
  const [isLevelUpModalOpen, setIsLevelUpModalOpen] = useState(false)
  const latestAttempt = playerAddress && huntId
    ? getPlayerAttempts(playerAddress).find((a) => a.huntId === huntId) ?? null
    : null

  const { data: registrationStatus } = useQuery({
    queryKey: queryKeys.registration.status(huntId, playerAddress),
    queryFn: () =>
      huntId && playerAddress ? checkRegistrationStatus(huntId, playerAddress) : null,
    enabled: isOpen && !!huntId && !!playerAddress,
    staleTime: Math.max(
      SOROBAN_READ_STALE_TIME_MS,
      queryCachePolicy.registrationStatus.staleTime
    ),
    gcTime: queryCachePolicy.registrationStatus.gcTime,
    refetchInterval: queryCachePolicy.registrationStatus.refetchInterval,
    refetchIntervalInBackground: true,
  })

  const playerProgress = registrationStatus?.progressData
    ? {
        is_completed: registrationStatus.progressData.completed,
        reward_claimed: registrationStatus.progressData.reward_claimed,
        hunt_id: huntId,
        reward_amount: reward,
      }
    : undefined

  useEffect(() => {
    if (!isOpen) return

    if (!prefersReducedMotion) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } })
    }

    if (playerAddress) {
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

  const hasProgressData = !!registrationStatus?.progressData?.hunt_id

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="bg-gradient-to-br from-[#2F2FFF] to-[#E87785] bg-clip-text text-transparent text-2xl font-bold mb-4 text-center">
              Game Complete
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="bg-gradient-to-b from-[#576065] to-[#787884] bg-clip-text text-transparent text-2xl font-normal">
              You successfully completed TDH&apos;s Crossword
            </p>

            <div className="flex items-center justify-center gap-2 text-2xl">
              <span>🥇</span>
              <span className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent text-2xl font-bold">
                1st Place
              </span>
            </div>

            <GameCompleteStats
              latestAttempt={latestAttempt}
              reward={reward}
              rewardReceipt={rewardReceipt}
            />

            <GameCompleteAchievements newAchievements={newAchievements} />

            {/* Claim reward */}
            {playerProgress && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <p className="mb-2 text-sm font-semibold text-slate-800">Claim your reward</p>
                <RewardsPanel rewards={[]} playerProgress={playerProgress} />
              </div>
            )}

            {/* NFT mint progress */}
            <div className="mt-6 border-t border-slate-100 pt-6">
              <NftMintProgress
                huntId={huntId ?? 0}
                rank={1}
                recipientAddress={playerAddress}
              />
            </div>

            <GameCompleteActions onGoHome={onGoHome} onReplay={onReplay} />

            <div className="flex flex-col gap-3 pt-2">
              <GameCompleteShare
                huntId={huntId}
                playerAddress={playerAddress}
                reward={reward}
                hasProgressData={hasProgressData}
              />

              <Button
                onClick={onViewLeaderboard}
                className="w-full bg-gradient-to-b from-[#FFD43E] to-[#EC7F00] text-white text-xl font-black cursor-pointer rounded-xl h-11"
              >
                See Leaderboard
              </Button>

              <GameCompleteReview
                isOpen={isOpen}
                huntId={huntId}
                playerAddress={playerAddress}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {levelUpData && (
        <LevelUpModal
          isOpen={isLevelUpModalOpen}
          onClose={() => setIsLevelUpModalOpen(false)}
          oldLevel={levelUpData.oldLevel}
          newLevel={levelUpData.newLevel}
          oldTier={levelUpData.oldTier}
          newTier={levelUpData.newTier}
        />
      )}
    </>
  )
}
