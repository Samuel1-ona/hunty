import { useRef, useState } from "react"
import { Download, MessageCircle, Share2, Twitter } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AchievementCertificate } from "@/components/AchievementCertificate"
import {
  buildDeepLink,
  downloadElementAsImage,
  shareOnTwitter,
  shareOnFarcaster,
  shareOnTelegram,
  shareOnWhatsApp,
} from "@/lib/downloadAsImage"
import { toast } from "sonner"
import { logger } from "@/lib/logger"

interface GameCompleteShareProps {
  huntId?: number
  playerAddress?: string
  reward: number
  hasProgressData: boolean
}

export function GameCompleteShare({
  huntId,
  playerAddress,
  reward,
  hasProgressData,
}: GameCompleteShareProps) {
  const certificateRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleShareAchievement = async (
    platform?: "twitter" | "farcaster" | "telegram" | "whatsapp"
  ) => {
    if (!certificateRef.current) return
    setIsGenerating(true)
    try {
      const filename = `hunty-achievement-${huntId}.png`
      await downloadElementAsImage(certificateRef.current, { filename })

      const shareText = `I just completed "${
        hasProgressData ? `Hunt #${huntId}` : "a Scavenger Hunt"
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

  return (
    <>
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

      {/* Hidden Achievement Certificate for capture */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none">
        <AchievementCertificate
          ref={certificateRef}
          playerName={
            playerAddress
              ? `${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}`
              : "Explorer"
          }
          huntTitle={hasProgressData ? `Hunt #${huntId}` : "Scavenger Hunt"}
          points={reward}
          rank={1}
        />
      </div>
    </>
  )
}
