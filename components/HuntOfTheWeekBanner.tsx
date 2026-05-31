"use client"

import { useQuery } from "@tanstack/react-query"
import { getAllHunts } from "@/lib/huntStore"
import { Trophy, ArrowRight, Star, Sparkles, Award, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { HuntCoverImage } from "@/components/HuntCoverImage"

export function HuntOfTheWeekBanner() {
  // 1. Fetch the server-side featured hunt ID
  const { data: featuredData, isLoading: isLoadingFeatured } = useQuery({
    queryKey: ["featuredHuntId"],
    queryFn: async () => {
      const res = await fetch("/api/admin/featured")
      if (!res.ok) return { featuredHuntId: null }
      return res.json() as Promise<{ featuredHuntId: number | null }>
    }
  })

  // 2. Fetch all hunts from local store
  const { data: hunts = [], isLoading: isLoadingHunts } = useQuery({
    queryKey: ["activeHunts"],
    queryFn: async () => getAllHunts(),
  })

  const featuredHuntId = featuredData?.featuredHuntId ?? null
  const isLoading = isLoadingFeatured || isLoadingHunts

  if (isLoading) {
    return (
      <div className="w-full rounded-3xl overflow-hidden p-8 mb-10 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center">
          <Skeleton className="w-full md:w-1/3 h-48 rounded-2xl bg-slate-200 dark:bg-slate-700" />
          <div className="flex-1 space-y-4 w-full">
            <Skeleton className="h-6 w-32 rounded bg-slate-200 dark:bg-slate-700" />
            <Skeleton className="h-10 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
            <Skeleton className="h-6 w-full rounded bg-slate-200 dark:bg-slate-700" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
              <Skeleton className="h-8 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Find the featured hunt in active hunts (only active ones are featured in Arcade)
  const featuredHunt = hunts.find(h => h.id === featuredHuntId && h.status === "Active")

  // Gracefully hide if no featured hunt is set or found
  if (!featuredHunt) return null

  // Format creator email or display "Community Pick"
  const creatorDisplay = featuredHunt.creatorEmail 
    ? featuredHunt.creatorEmail.split("@")[0] 
    : "Hunty Team"

  return (
    <div className="w-full rounded-3xl overflow-hidden mb-10 border border-amber-300/40 dark:border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 dark:from-amber-900/10 dark:via-rose-950/10 dark:to-slate-900/30 shadow-xl relative backdrop-blur-md">
      {/* Decorative backdrop gradients */}
      <div className="absolute inset-0 bg-white/20 dark:bg-slate-950/20 pointer-events-none" />
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-gradient-to-tr from-indigo-500 to-[#E87785] opacity-20 blur-3xl pointer-events-none" />

      <div className="p-6 md:p-10 flex flex-col md:flex-row gap-8 items-center relative z-10">
        {/* Left Side: Gorgeous cover image with special glow */}
        <div className="w-full md:w-1/3 flex-shrink-0 relative group">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400 via-pink-500 to-[#3737A4] opacity-35 blur-md group-hover:opacity-60 transition-all duration-300" />
          <div className="relative rounded-2xl overflow-hidden border border-white/30 dark:border-white/10 shadow-lg bg-slate-950">
            <HuntCoverImage
              src={featuredHunt.coverImageCid}
              alt={`${featuredHunt.title} cover`}
              className="w-full h-48 md:h-52 bg-slate-900 object-cover"
            />
          </div>
        </div>

        {/* Right Side: Showcase Metadata */}
        <div className="flex-1 flex flex-col w-full text-left">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 bg-amber-500/90 dark:bg-amber-500/20 text-slate-950 dark:text-amber-450 border border-amber-400/40 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-md animate-pulse">
              <Trophy className="h-3.5 w-3.5" />
              Hunt of the Week
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <Sparkles className="h-3 w-3 text-pink-500 animate-spin-slow" />
              Editorial Pick
            </span>
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-[#3737A4] dark:from-white dark:via-slate-100 dark:to-indigo-300 bg-clip-text text-transparent">
            {featuredHunt.title}
          </h2>

          {/* Description */}
          <p className="text-slate-650 dark:text-slate-350 text-sm md:text-base mb-5 leading-relaxed max-w-3xl">
            {featuredHunt.description}
          </p>

          {/* Stats & Creator Row */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs font-bold text-[#3737A4] dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/40">
              {featuredHunt.cluesCount} {featuredHunt.cluesCount === 1 ? "Clue" : "Clues"}
            </span>

            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
              featuredHunt.rewardType === "XLM" 
                ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-100/50 dark:border-green-900/40" 
                : featuredHunt.rewardType === "NFT" 
                  ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-100/50 dark:border-purple-900/40" 
                  : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100/50 dark:border-amber-900/40"
            }`}>
              <Award className="h-3.5 w-3.5" />
              {featuredHunt.rewardType} Prize
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/60">
              <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              Creator: <span className="text-[#3737A4] dark:text-indigo-400">{creatorDisplay}</span>
            </span>
          </div>

          {/* Action Button */}
          <div className="flex">
            <Button
              className="bg-gradient-to-r from-amber-500 via-rose-500 to-[#3737A4] hover:opacity-95 text-slate-950 font-black px-8 py-6 rounded-2xl text-base md:text-lg flex items-center gap-2.5 shadow-lg border border-amber-300/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
              onClick={() => {
                window.location.href = `/hunt/${featuredHunt.id}`
              }}
            >
              Play Featured Hunt
              <ArrowRight className="h-5 w-5 stroke-[2.5]" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
