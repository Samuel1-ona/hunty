"use client"

import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"
import Image from "next/image"
import confetti from "canvas-confetti"
import { AlertCircle, Clock3, Download, Lightbulb, Loader2, Medal, MessageCircle, Share2, Star, Twitter } from "lucide-react"

import { Button } from "@hunty/ui"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Coin from "@/components/icons/Coin"
import Replay from "@/components/icons/Replay"
import { RewardsPanel } from "@/components/RewardsPanel"
import { NftMintProgress } from "@/components/NftMintProgress"
import { AchievementCertificate } from "@/components/AchievementCertificate"
import { LevelUpModal } from "./LevelUpModal"
import { useQuery } from "@tanstack/react-query"
import { checkRegistrationStatus } from "@/lib/contracts/player-registration"
import { SOROBAN_READ_STALE_TIME_MS } from "@/lib/soroban/queryConfig"
import { useXlmUsdPrice } from "@/hooks/useXlmUsdPrice"
import {
  buildDeepLink,
  buildResultCardImageUrl,
  downloadElementAsImage,
  shareOnTwitter,
  shareOnFarcaster,
  shareOnTelegram,
  shareOnWhatsApp,
} from "@/lib/downloadAsImage"
import { toast } from "sonner"
import { ACHIEVEMENTS } from "@/lib/achievements/config"
import { checkAndAwardAchievements } from "@/lib/achievements/service"
import { logger } from "@/lib/logger"
import type { HuntAttemptRecord, RewardReceipt } from "@/lib/types"
import { queryCachePolicy, queryKeys } from "@/lib/queryKeys"
import { awardXpFromHunt, getLevelTierForXp, getPlayerLevel } from "@/lib/level"
import { formatDuration, getPlayerAttempts } from "@/lib/huntAttemptHistory"
import { cn } from "@/lib/utils"

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
  const { price: xlmUsdPrice } = useXlmUsdPrice()

  const currencyFormatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  })

  const usdEquivalent =
    xlmUsdPrice != null ? currencyFormatter.format(reward * xlmUsdPrice) : null

  const certificateRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [resultCardGenerating, setResultCardGenerating] = useState(false)
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

  // ─── Review form state ────────────────────────────────────────────────────
  const [selectedRating, setSelectedRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("")
  const [reviewText, setReviewText] = useState("")
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  // ─── Derived stats from the latest attempt ────────────────────────────────
  const completionTimeLabel = latestAttempt
    ? formatDuration(latestAttempt.totalTimeSeconds)
    : "—"

  const totalHintsUsed = latestAttempt
    ? latestAttempt.clues.reduce((sum, c) => sum + (c.hintsUsed ?? 0), 0)
    : 0

  // Rank is not tracked locally; show a dash until the leaderboard is opened
  const rankLabel = "—"

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

    // Load the most recent attempt for this hunt so we can derive stats
    if (playerAddress && huntId) {
      const attempts = getPlayerAttempts(playerAddress)
      const match = attempts.find((a) => a.huntId === huntId) ?? null
      setLatestAttempt(match)
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

  // Reset review form when the modal re-opens for a new hunt
  useEffect(() => {
    if (isOpen) {
      setSelectedRating(0)
      setHoverRating(0)
      setSelectedDifficulty("")
      setReviewText("")
      setReviewSubmitting(false)
      setReviewSubmitted(false)
      setReviewError(null)
    }
  }, [isOpen, huntId])

  // ─── Review submission ────────────────────────────────────────────────────
  const handleRateHunt = (rating: number) => {
    setSelectedRating(rating)
    setReviewError(null)
  }

  const handleSubmitReview = async () => {
    if (!playerAddress || !huntId) {
      setReviewError("Connect your wallet to leave a review.")
      return
    }
    if (selectedRating === 0) {
      setReviewError("Please select a star rating first.")
      return
    }

    setReviewSubmitting(true)
    setReviewError(null)

    try {
      // Register completion server-side so the review gate passes
      await fetch(`/api/v1/hunts/${huntId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerAddress }),
      })

      const res = await fetch(`/api/v1/hunts/${huntId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerAddress,
          rating: selectedRating,
          text: reviewText.trim() || undefined,
          difficultyRating: selectedDifficulty || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review")
      }

      setReviewSubmitted(true)
      toast.success("Review submitted — thanks for the feedback!")
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An error occurred while submitting your review."
      setReviewError(message)
    } finally {
      setReviewSubmitting(false)
    }
  }

  // ─── Share achievement ────────────────────────────────────────────────────
  const handleShareAchievement = async (
    platform?: "twitter" | "farcaster" | "telegram" | "whatsapp"
  ) => {
    if (!certificateRef.current) return
    setIsGenerating(true)
    try {
      const filename = `hunty-achievement-${huntId}.png`
      await downloadElementAsImage(certificateRef.current, { filename })

      const shareText = `I just completed "${
        registrationStatus?.progressData?.hunt_id ? `Hunt #${huntId}` : "a Scavenger Hunt"
      }" on @huntyapp! Check it out:`
      const shareUrl = buildDeepLink(`/hunt/${huntId}`)

      if (platform === "twitter") shareOnTwitter(shareText, shareUrl)
      else if (platform === "farcaster") shareOnFarcaster(shareText, shareUrl)
      else if (platform === "telegram") shareOnTelegram(shareText, shareUrl)
      else if (platform === "whatsapp") shareOnWhatsApp(shareText, shareUrl)
      else toast.success("Achievement image downloaded! You can now share it manually.")
    } catch (error) {
      logger.error("Failed to share achievement:", error)
      toast.error("Failed to generate achievement image.")
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * Share (or download) the result-card OG image generated on completion.
   * Reuses the existing OG image pipeline (`/api/og/result`) with the player's
   * rank and completion time baked in.
   */
  const handleShareResultCard = async (
    platform?: "twitter" | "farcaster" | "telegram" | "whatsapp"
  ) => {
    if (!playerAddress || !huntId) return
    setResultCardGenerating(true)
    try {
      const rank =
        rewardReceipt?.rank ??
        (latestAttempt?.isFirstToComplete ? 1 : undefined)
      const resultCardUrl = buildResultCardImageUrl(huntId, playerAddress, {
        rank,
        time: latestAttempt ? Math.max(0, latestAttempt.totalTimeSeconds) : undefined,
      })

      if (platform) {
        const shareText = `I just completed "${latestAttempt?.huntTitle ?? `Hunt #${huntId}`}" on @huntyapp! Check out my result:`
        if (platform === "twitter") shareOnTwitter(shareText, resultCardUrl, resultCardUrl)
        else if (platform === "farcaster") shareOnFarcaster(shareText, resultCardUrl)
        else if (platform === "telegram") shareOnTelegram(shareText, resultCardUrl)
        else if (platform === "whatsapp") shareOnWhatsApp(shareText, resultCardUrl)
      } else {
        // No platform -> download the generated card as a PNG.
        const res = await fetch(resultCardUrl)
        if (!res.ok) throw new Error(`Result card request failed (${res.status})`)
        const blob = await res.blob()
        const objectUrl = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = objectUrl
        link.download = `hunty-result-${huntId}.png`
        link.click()
        URL.revokeObjectURL(objectUrl)
        toast.success("Result card downloaded! You can now share it manually.")
      }
    } catch (error) {
      logger.error("Failed to share result card:", error)
      toast.error("Failed to generate result card.")
    } finally {
      setResultCardGenerating(false)
    }
  }

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

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="rounded-lg bg-white p-2 text-center">
                <div className="mx-auto mb-1 w-fit rounded-full bg-indigo-100 p-1.5 text-indigo-700">
                  <Clock3 className="h-3.5 w-3.5" />
                </div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Time</p>
                <p className="text-xs font-semibold text-slate-800">{completionTimeLabel}</p>
              </div>
              <div className="rounded-lg bg-white p-2 text-center">
                <div className="mx-auto mb-1 w-fit rounded-full bg-amber-100 p-1.5 text-amber-700">
                  <Lightbulb className="h-3.5 w-3.5" />
                </div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Hints</p>
                <p className="text-xs font-semibold text-slate-800">{totalHintsUsed}</p>
              </div>
              <div className="rounded-lg bg-white p-2 text-center">
                <div className="mx-auto mb-1 w-fit rounded-full bg-emerald-100 p-1.5 text-emerald-700">
                  <Medal className="h-3.5 w-3.5" />
                </div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Rank</p>
                <p className="text-xs font-semibold text-slate-800">{rankLabel}</p>
              </div>
            </div>

            {/* Reward */}
            <div className="flex items-center justify-center gap-2 w-full">
              <p className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent text-xl font-normal mb-2">
                You won
              </p>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center gap-2 bg-[#e5e5eb] p-2 rounded-xl w-[230px]">
                  <Coin />
                  <span className="font-bold text-lg">{reward}</span>
                </div>
                {usdEquivalent && (
                  <span className="text-sm text-slate-500">≈ {usdEquivalent}</span>
                )}
              </div>
            </div>

            {/* Reward receipt */}
            {rewardReceipt && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left">
                <p className="text-sm font-semibold text-emerald-900">Reward receipt</p>
                <div className="mt-2 space-y-1 text-xs text-emerald-800">
                  <p>
                    Amount:{" "}
                    <span className="font-semibold">{rewardReceipt.amount.toFixed(7)} XLM</span>
                  </p>
                  {rewardReceipt.rank && (
                    <p>
                      Winner rank:{" "}
                      <span className="font-semibold">#{rewardReceipt.rank}</span>
                    </p>
                  )}
                  <p className="break-all">
                    Tx: <span className="font-mono">{rewardReceipt.txHash}</span>
                  </p>
                </div>
              </div>
            )}

            {/* New achievements */}
            {newAchievements.length > 0 && (
              <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-3">
                  🎉 New Achievements Unlocked!
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {newAchievements.map((achievementId) => {
                    const achievement = ACHIEVEMENTS[achievementId as keyof typeof ACHIEVEMENTS]
                    return achievement ? (
                      <div
                        key={achievementId}
                        className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg"
                      >
                        <span className="text-2xl">{achievement.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {achievement.title}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                    ) : null
                  })}
                </div>
              </div>
            )}

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

            {/* Nav buttons */}
            <div className="flex gap-4">
              <div className="flex-1 p-[2px] bg-gradient-to-br from-[#4A4AFF] to-[#0C0C4F] rounded-xl">
                <Button
                  onClick={onGoHome}
                  variant="outline"
                  className="w-full h-full bg-white border-none shadow-none rounded-xl"
                  style={{ background: "white" }}
                >
                  <span className="bg-gradient-to-br from-[#4A4AFF] to-[#0C0C4F] bg-clip-text text-transparent font-bold cursor-pointer">
                    Go Home
                  </span>
                </Button>
              </div>
              <Button
                onClick={onReplay}
                className="flex-1 bg-gradient-to-br from-[#E3225C] to-[#7B1C4A] hover:bg-pink-600 text-white cursor-pointer rounded-xl"
              >
                <Replay /> Replay
              </Button>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              {/* Share achievement */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isGenerating}
                    className="w-full border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-xl flex items-center gap-2 h-11"
                  >
                    {isGenerating ? (
                      "Generating..."
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        Share Achievement
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-[200px] rounded-xl">
                  <DropdownMenuItem
                    onClick={() => handleShareAchievement("twitter")}
                    className="flex items-center gap-2 cursor-pointer py-2.5"
                  >
                    <Twitter className="w-4 h-4 text-sky-500" />
                    Share on Twitter / X
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleShareAchievement("farcaster")}
                    className="flex items-center gap-2 cursor-pointer py-2.5"
                  >
                    <Image
                      src="/icons/farcaster.png"
                      alt="Farcaster"
                      width={16}
                      height={16}
                      className="opacity-70"
                    />
                    Share on Farcaster
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleShareAchievement("telegram")}
                    className="flex items-center gap-2 cursor-pointer py-2.5"
                  >
                    <MessageCircle className="w-4 h-4 text-cyan-600" />
                    Share on Telegram
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleShareAchievement("whatsapp")}
                    className="flex items-center gap-2 cursor-pointer py-2.5"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    Share on WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleShareAchievement()}
                    className="flex items-center gap-2 cursor-pointer py-2.5 border-t mt-1"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    Download Image Only
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Share result card (OG image: rank, time, hunt name) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={resultCardGenerating || !playerAddress || !huntId}
                    className="w-full border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-xl flex items-center gap-2 h-11"
                  >
                    {resultCardGenerating ? (
                      "Generating..."
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Share Result Card
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-[200px] rounded-xl">
                  <DropdownMenuItem
                    onClick={() => handleShareResultCard("twitter")}
                    className="flex items-center gap-2 cursor-pointer py-2.5"
                  >
                    <Twitter className="w-4 h-4 text-sky-500" />
                    Share on Twitter / X
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleShareResultCard("farcaster")}
                    className="flex items-center gap-2 cursor-pointer py-2.5"
                  >
                    <Image
                      src="/icons/farcaster.png"
                      alt="Farcaster"
                      width={16}
                      height={16}
                      className="opacity-70"
                    />
                    Share on Farcaster
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleShareResultCard("telegram")}
                    className="flex items-center gap-2 cursor-pointer py-2.5"
                  >
                    <MessageCircle className="w-4 h-4 text-cyan-600" />
                    Share on Telegram
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleShareResultCard("whatsapp")}
                    className="flex items-center gap-2 cursor-pointer py-2.5"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    Share on WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleShareResultCard()}
                    className="flex items-center gap-2 cursor-pointer py-2.5 border-t mt-1"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    Download Result Card
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                onClick={onViewLeaderboard}
                className="w-full bg-gradient-to-b from-[#FFD43E] to-[#EC7F00] text-white text-xl font-black cursor-pointer rounded-xl h-11"
              >
                See Leaderboard
              </Button>

              {/* ── Rate & Review section ─────────────────────────────────── */}
              {!reviewSubmitted ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Rate this hunt</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Your feedback helps other players discover great hunts.
                    </p>
                  </div>

                  {/* Star picker */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                        className="rounded-md p-1 hover:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        onClick={() => handleRateHunt(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                      >
                        <Star
                          className={cn(
                            "h-5 w-5 transition-colors",
                            star <= (hoverRating || selectedRating)
                              ? "fill-amber-400 stroke-amber-500 text-amber-500"
                              : "stroke-slate-400 text-slate-400"
                          )}
                        />
                      </button>
                    ))}
                    {selectedRating > 0 && (
                      <span className="ml-1 text-xs text-slate-600 font-medium">
                        {selectedRating}/5
                      </span>
                    )}
                  </div>
                  
                  {/* Difficulty picker */}
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">How difficult was it?</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {["Easy", "Medium", "Hard", "Expert"].map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setSelectedDifficulty(diff)}
                          className={cn(
                            "px-3 py-1 text-xs font-semibold rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                            selectedDifficulty === diff
                              ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional text review */}
                  {selectedRating > 0 && (
                    <div className="space-y-1">
                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Optional — share what you thought about the clues, difficulty, or location…"
                        maxLength={500}
                        rows={3}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
                      />
                      <div className="text-right text-[10px] text-slate-400">
                        {reviewText.length}/500
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {reviewError && (
                    <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{reviewError}</span>
                    </div>
                  )}

                  {/* Submit */}
                  <Button
                    type="button"
                    size="sm"
                    disabled={selectedRating === 0 || reviewSubmitting}
                    onClick={handleSubmitReview}
                    className="w-full bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-40"
                  >
                    {reviewSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      "Submit Review"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center space-y-1">
                  <p className="text-sm font-semibold text-emerald-700">Review submitted!</p>
                  <p className="text-xs text-emerald-600">
                    Thanks for helping the community discover quality hunts.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Hidden Achievement Certificate for capture */}
          <div className="fixed left-[-9999px] top-0 pointer-events-none">
            <AchievementCertificate
              ref={certificateRef}
              playerName={
                playerAddress
                  ? `${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}`
                  : "Explorer"
              }
              huntTitle={
                registrationStatus?.progressData?.hunt_id
                  ? `Hunt #${huntId}`
                  : "Scavenger Hunt"
              }
              points={reward}
              rank={1}
            />
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
