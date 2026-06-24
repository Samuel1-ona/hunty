"use client"

import { useEffect } from "react"
import { useReducedMotion } from "framer-motion"
import Image from "next/image"
import confetti from "canvas-confetti"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Coin from "@/components/icons/Coin"
import Replay from "@/components/icons/Replay"
import { RewardsPanel } from "@/components/RewardsPanel"
import { useQuery } from "@tanstack/react-query"
import { checkRegistrationStatus } from "@/lib/contracts/player-registration"
import { SOROBAN_READ_STALE_TIME_MS } from "@/lib/soroban/queryConfig"
import { useRef, useState } from "react"
import { useXlmUsdPrice } from "@/hooks/useXlmUsdPrice"
import { AchievementCertificate } from "@/components/AchievementCertificate"
import { downloadElementAsImage, shareOnTwitter, shareOnFarcaster } from "@/lib/downloadAsImage"
import { Share2, Twitter, Download } from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { ACHIEVEMENTS } from "@/lib/achievements/config"
import { checkAndAwardAchievements } from "@/lib/achievements/service"
import { logger } from "@/lib/logger"
import type { RewardReceipt } from "@/lib/types"

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
  const { price: xlmUsdPrice } = useXlmUsdPrice();

  const currencyFormatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

  const usdEquivalent =
    xlmUsdPrice != null ? currencyFormatter.format(reward * xlmUsdPrice) : null;

  const certificateRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const [newAchievements, setNewAchievements] = useState<string[]>([])

  const { data: registrationStatus } = useQuery({
    queryKey: queryKeys.registration.status(huntId, playerAddress),
    queryFn: () => (huntId && playerAddress ? checkRegistrationStatus(huntId, playerAddress) : null),
    enabled: isOpen && !!huntId && !!playerAddress,
    staleTime: Math.max(SOROBAN_READ_STALE_TIME_MS, queryCachePolicy.registrationStatus.staleTime),
    gcTime: queryCachePolicy.registrationStatus.gcTime,
    refetchInterval: queryCachePolicy.registrationStatus.refetchInterval,
    refetchIntervalInBackground: true,
  });

  const playerProgress = registrationStatus?.progressData ? {
    is_completed: registrationStatus.progressData.completed,
    reward_claimed: registrationStatus.progressData.reward_claimed,
    hunt_id: huntId,
    reward_amount: reward,
  } : undefined;

  useEffect(() => {
    if (isOpen) {
      if (!prefersReducedMotion) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
        });
      }

      // Check and award achievements on hunt completion
      if (playerAddress) {
        try {
          const earned = checkAndAwardAchievements(playerAddress, {
            totalHuntsCompleted: 1, // This is a completion
            totalHuntsWon: 1, // Assuming 1st place = win
            totalNftsEarned: 0,
            fastestCompletionSeconds: undefined,
          })

          if (earned.length > 0) {
            setNewAchievements(earned)
            // Show toast for each new achievement
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
      }
    }
  }, [isOpen, playerAddress, prefersReducedMotion]);

  const handleShareAchievement = async (platform?: "twitter" | "farcaster") => {
    if (!certificateRef.current) return

    setIsGenerating(true)
    try {
      // First download the image
      const filename = `hunty-achievement-${huntId}.png`
      await downloadElementAsImage(certificateRef.current, { filename })
      
      const shareText = `I just completed "${registrationStatus?.progressData?.hunt_id ? `Hunt #${huntId}` : "a Scavenger Hunt"}" on @huntyapp! Check it out:`
      const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/hunt/${huntId}` : "https://hunty.app"

      if (platform === "twitter") {
        shareOnTwitter(shareText, shareUrl)
      } else if (platform === "farcaster") {
        shareOnFarcaster(shareText, shareUrl)
      } else {
        toast.success("Achievement image downloaded! You can now share it manually.")
      }
    } catch (error) {
      logger.error("Failed to share achievement:", error)
      toast.error("Failed to generate achievement image.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="bg-gradient-to-br from-[#2F2FFF] to-[#E87785] bg-clip-text text-transparent text-2xl font-bold mb-4 text-center">Game Complete</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="bg-gradient-to-b from-[#576065] to-[#787884] bg-clip-text text-transparent text-2xl font-normal">You successfully completed TDH&apos;s Crossword</p>
          <div className="flex items-center justify-center gap-2 text-2xl">
            <span>🥇</span>
            <span className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent text-2xl font-bold">1st Place</span>
          </div>            <div className="flex items-center justify-center gap-2 w-full">
            <p className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent text-xl font-normal  mb-2">You won</p>
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center justify-center gap-2 bg-[#e5e5eb] p-2 rounded-xl w-[230px]">
                <Coin />
                <span className="font-bold text-lg">{reward}</span>
              </div>
              {usdEquivalent && (
                <span className="text-sm text-slate-500">
                  ≈ {usdEquivalent}
                </span>
              )}
            </div>
          </div>

          {rewardReceipt && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left">
              <p className="text-sm font-semibold text-emerald-900">Reward receipt</p>
              <div className="mt-2 space-y-1 text-xs text-emerald-800">
                <p>
                  Amount: <span className="font-semibold">{rewardReceipt.amount.toFixed(7)} XLM</span>
                </p>
                {rewardReceipt.rank && (
                  <p>
                    Winner rank: <span className="font-semibold">#{rewardReceipt.rank}</span>
                  </p>
                )}
                <p className="break-all">
                  Tx: <span className="font-mono">{rewardReceipt.txHash}</span>
                </p>
              </div>
            </div>
          )}

          {/* New Achievements Display */}
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

          {playerProgress && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <RewardsPanel
                rewards={[]}
                playerProgress={playerProgress}
              />
            </div>
          )}
         
          <div className="flex gap-4">
            <div className="flex-1 p-[2px] bg-gradient-to-br from-[#4A4AFF] to-[#0C0C4F] rounded-xl">
            <Button
              onClick={onGoHome}
              variant="outline"
              className="w-full h-full bg-white border-none shadow-none rounded-xl"
              style={{ background: 'white' }}
            >
              <span className="bg-gradient-to-br from-[#4A4AFF] to-[#0C0C4F] bg-clip-text text-transparent font-bold cursor-pointer">
                Go Home
              </span>
            </Button>
          </div>
            <Button onClick={onReplay} className="flex-1 bg-gradient-to-br from-[#E3225C] to-[#7B1C4A] hover:bg-pink-600 text-white cursor-pointer rounded-xl">
              <Replay /> Replay
            </Button>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  disabled={isGenerating}
                  className="w-full border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-xl flex items-center gap-2 h-11"
                >
                  {isGenerating ? "Generating..." : (
                    <>
                      <Share2 className="w-4 h-4" />
                      Share Achievement
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-[200px] rounded-xl">
                <DropdownMenuItem onClick={() => handleShareAchievement("twitter")} className="flex items-center gap-2 cursor-pointer py-2.5">
                  <Twitter className="w-4 h-4 text-sky-500" />
                  Share on Twitter / X
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShareAchievement("farcaster")} className="flex items-center gap-2 cursor-pointer py-2.5">
                  <Image src="/icons/farcaster.png" alt="Farcaster" width={16} height={16} className="opacity-70" />
                  Share on Farcaster
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShareAchievement()} className="flex items-center gap-2 cursor-pointer py-2.5 border-t mt-1">
                  <Download className="w-4 h-4 text-slate-500" />
                  Download Image Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={onViewLeaderboard} className="w-full bg-gradient-to-b from-[#FFD43E] to-[#EC7F00] text-white text-xl font-black cursor-pointer rounded-xl h-11">
              See Leaderboard
            </Button>
          </div>
        </div>

        {/* Hidden Achievement Certificate for Capture */}
        <div className="fixed left-[-9999px] top-0 pointer-events-none">
          <AchievementCertificate
            ref={certificateRef}
            playerName={playerAddress ? `${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}` : "Explorer"}
            huntTitle={registrationStatus?.progressData?.hunt_id ? `Hunt #${huntId}` : "Scavenger Hunt"}
            points={reward}
            rank={1} // Defaulting to 1 for now or we can get rank from leaderboard
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
