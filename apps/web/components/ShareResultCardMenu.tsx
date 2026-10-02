"use client"

import { useState } from "react"
import { Download, MessageCircle, Twitter } from "lucide-react"
import Image from "next/image"
import { Button } from "@hunty/ui"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { logger } from "@/lib/logger"
import {
  buildResultCardImageUrl,
  shareOnTwitter,
  shareOnFarcaster,
  shareOnTelegram,
  shareOnWhatsApp,
} from "@/lib/downloadAsImage"
import type { HuntAttemptRecord, RewardReceipt } from "@/lib/types"

interface ShareResultCardMenuProps {
  huntId?: number
  playerAddress?: string
  latestAttempt: HuntAttemptRecord | null
  rewardReceipt?: RewardReceipt | null
}

export function ShareResultCardMenu({
  huntId,
  playerAddress,
  latestAttempt,
  rewardReceipt,
}: ShareResultCardMenuProps) {
  const [resultCardGenerating, setResultCardGenerating] = useState(false)

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
        const shareText = `I just completed "${latestAttempt?.huntTitle ?? \`Hunt #\${huntId}\`}" on @huntyapp! Check out my result:`
        if (platform === "twitter") shareOnTwitter(shareText, resultCardUrl, resultCardUrl)
        else if (platform === "farcaster") shareOnFarcaster(shareText, resultCardUrl)
        else if (platform === "telegram") shareOnTelegram(shareText, resultCardUrl)
        else if (platform === "whatsapp") shareOnWhatsApp(shareText, resultCardUrl)
      } else {
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
  )
}
