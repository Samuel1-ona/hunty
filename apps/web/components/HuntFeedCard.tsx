"use client"

import { Trophy, MapPin, Clock, Users, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { HuntCoverImage } from "@/components/HuntCoverImage"
import type { StoredHunt } from "@/lib/types"
import { cn } from "@/lib/utils"

interface HuntFeedCardProps {
  hunt: StoredHunt
  /** Optional player count badge */
  playerCount?: number
  /** Optional distance from the user's location, in meters */
  distanceMeters?: number
  /** Whether this hunt is trending */
  isTrending?: boolean
  /** Whether the card is compact (list style) or full (grid style) */
  compact?: boolean
  /** Optional class name */
  className?: string
}

function relativeTime(timestampSeconds: number): string {
  const diffSeconds = Math.floor(Date.now() / 1000) - timestampSeconds
  if (diffSeconds < 60) return "just now"
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(timestampSeconds * 1000).toLocaleDateString()
}

function formatDistance(distanceMeters?: number): string | null {
  if (typeof distanceMeters !== "number" || Number.isNaN(distanceMeters) || !Number.isFinite(distanceMeters)) {
    return null
  }

  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m away`
  }

  return `${(distanceMeters / 1000).toFixed(distanceMeters < 10000 ? 1 : 0)} km away`
}

function formatAgeClassification(classification?: StoredHunt["ageClassification"]): string {
  if (!classification || classification === "all-ages") return "All ages"
  return classification.replace("-plus", "+")
}

export function HuntFeedCard({
  hunt,
  playerCount,
  distanceMeters,
  isTrending,
  compact = false,
  className,
}: HuntFeedCardProps) {
  const huntStatus = hunt.status === "Active" ? "Live" : hunt.status
  const distanceLabel = formatDistance(distanceMeters)
  const ageLabel = formatAgeClassification(hunt.ageClassification)

  return (
    <Link href={`/hunt/${hunt.id}`} className="block group focus:outline-none">
      <Card
        className={cn(
          "h-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-all duration-200",
          "hover:shadow-md hover:border-[#3737A4]/30 dark:hover:border-[#3737A4]/50",
          "group-focus-visible:ring-2 group-focus-visible:ring-[#3737A4] group-focus-visible:ring-offset-2",
          compact ? "flex flex-row" : "flex flex-col",
          className
        )}
      >
        {/* Cover Image - hidden in compact mode */}
        {!compact && (
          <div className="relative w-full h-40 bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <HuntCoverImage
              src={hunt.coverImageCid}
              alt={`${hunt.title} cover`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Status badge */}
            <span
              className={cn(
                "absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                hunt.status === "Active"
                  ? "bg-green-500/90 text-white"
                  : "bg-slate-500/80 text-white"
              )}
            >
              {huntStatus}
            </span>
            {/* Trending badge */}
            {isTrending && (
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-orange-500/90 px-2.5 py-0.5 text-[10px] font-bold text-white">
                🔥 Trending
              </span>
            )}
          </div>
        )}

        {/* Content */}
        <div className={cn("flex-1 flex flex-col", compact ? "p-4" : "p-5")}>
          {/* Title & Description */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2 mb-1">
              <CardTitle
                className={cn(
                  "font-semibold text-slate-900 dark:text-slate-100 line-clamp-2",
                  compact ? "text-base" : "text-lg"
                )}
              >
                {hunt.title}
              </CardTitle>
            </div>
            <CardDescription
              className={cn(
                "text-slate-600 dark:text-slate-400 line-clamp-2",
                compact ? "text-xs" : "text-sm"
              )}
            >
              {hunt.description}
            </CardDescription>
          </div>

          {/* Meta info */}
          <div className={cn("flex items-center flex-wrap gap-2", compact ? "mt-2" : "mt-4")}>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-3 h-3" />
              {ageLabel}
            </span>

            {distanceLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-400">
                <MapPin className="w-3 h-3" />
                {distanceLabel}
              </span>
            )}

            {/* Clues count */}
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 text-[11px] font-medium text-[#3737A4] dark:text-blue-400">
              <MapPin className="w-3 h-3" />
              {hunt.cluesCount} {hunt.cluesCount === 1 ? "Clue" : "Clues"}
            </span>

            {/* Reward type */}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                hunt.rewardType === "XLM"
                  ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                  : hunt.rewardType === "NFT"
                  ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
              )}
            >
              <Trophy className="w-3 h-3" />
              {hunt.rewardType}
            </span>

            {/* Player count */}
            {playerCount !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                <Users className="w-3 h-3" />
                {playerCount}
              </span>
            )}
          </div>

          {/* Time info and CTA */}
          <div className={cn("flex items-center justify-between", compact ? "mt-2" : "mt-3")}>
            {hunt.startTime && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                <Clock className="w-3 h-3" />
                {relativeTime(hunt.startTime)}
              </span>
            )}
            <Button
              size="sm"
              className={cn(
                "ml-auto bg-gradient-to-r from-[#3737A4] to-[#0C0C4F] hover:opacity-90 text-white rounded-xl font-semibold",
                compact ? "h-7 text-[10px] px-2.5" : "h-8 text-[11px] px-3"
              )}
              asChild
            >
              <Link href={`/hunt/${hunt.id}`}>Play</Link>
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  )
}

export function HuntFeedCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card
      aria-hidden="true"
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm",
        compact ? "flex flex-row" : "flex flex-col"
      )}
    >
      {!compact && (
        <div className="h-40 w-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
      )}
      <div className={cn("space-y-3", compact ? "p-4 flex-1" : "p-5")}>
        <div className="space-y-2">
          <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
          <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-7 w-14 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        </div>
      </div>
    </Card>
  )
}

export function HuntFeedCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <HuntFeedCardSkeleton key={`feed-skeleton-${index}`} />
      ))}
    </div>
  )
}
