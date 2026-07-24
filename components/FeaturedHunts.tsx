"use client"

import { useQuery } from "@tanstack/react-query"
import { getFeaturedHunts } from "@/lib/huntStore"
import { Trophy, Clock, Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { HuntCoverImage } from "@/components/HuntCoverImage"
import { queryCachePolicy, queryKeys } from "@/lib/queryKeys"
import { cn } from "@/lib/utils"

function timeRemaining(endTime?: number): string {
  if (!endTime) return ""
  const now = Math.floor(Date.now() / 1000)
  const diff = endTime - now
  if (diff <= 0) return "Ended"
  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  if (days > 0) return `${days}d ${hours}h left`
  return `${hours}h left`
}

export function FeaturedHunts() {
  const { data: featured = [], isLoading } = useQuery({
    queryKey: queryKeys.hunts.featured(),
    queryFn: () => getFeaturedHunts(3),
    staleTime: queryCachePolicy.featuredHunts.staleTime,
    gcTime: queryCachePolicy.featuredHunts.gcTime,
    refetchInterval: queryCachePolicy.featuredHunts.refetchInterval,
    refetchIntervalInBackground: true,
  })

  if (!isLoading && featured.length === 0) return null

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="w-6 h-6 text-amber-500" />
        <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-500 via-pink-500 to-[#3737A4] bg-clip-text text-transparent">
          Featured Hunts
        </h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 dark:border-white/10 p-6 bg-white dark:bg-slate-900/50">
              <Skeleton className="h-6 w-3/4 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3 mb-4" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {featured.map((hunt, idx) => (
            <div
              key={hunt.id}
              className={cn(
                "relative overflow-hidden rounded-2xl p-[2px]",
                idx === 0
                  ? "bg-gradient-to-br from-amber-400 via-pink-500 to-[#3737A4]"
                  : "bg-gradient-to-br from-[#3737A4] to-[#0C0C4F]"
              )}
            >
              <div className="relative h-full rounded-[14px] bg-white dark:bg-slate-900 p-5 flex flex-col">
                {idx === 0 && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    <Trophy className="w-3 h-3" />
                    Top Pick
                  </span>
                )}

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 pr-16 line-clamp-1">
                  {hunt.title}
                </h3>
                <HuntCoverImage
                  src={hunt.coverImageCid}
                  alt={`${hunt.title} cover`}
                  className="relative w-full h-36 rounded-xl overflow-hidden mb-3 bg-slate-100 dark:bg-slate-800"
                />

                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2 flex-1">
                  {hunt.description}
                </p>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/20 px-3 py-1 text-[11px] font-medium text-[#3737A4] dark:text-blue-400">
                    {hunt.cluesCount} {hunt.cluesCount === 1 ? "Clue" : "Clues"}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium",
                      hunt.rewardType === "XLM"
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : hunt.rewardType === "NFT"
                          ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
                          : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                    )}
                  >
                    {hunt.rewardType} Reward
                  </span>
                  {hunt.endTime && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-300">
                      <Clock className="w-3 h-3" />
                      {timeRemaining(hunt.endTime)}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 mt-auto">
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-[#3737A4] to-[#0C0C4F] hover:opacity-90 text-white rounded-xl font-semibold"
                    onClick={() => {
                      window.location.href = `/hunt/${hunt.id}`
                    }}
                  >
                    Play Now
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#3737A4] text-[#3737A4] hover:bg-[#3737A4]/10 rounded-xl font-semibold dark:border-blue-500 dark:text-blue-400"
                    onClick={() => {
                      window.location.href = `/hunt/${hunt.id}/leaderboard`
                    }}
                  >
                    Watch Live
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
