"use client"

import React, { useEffect, useState, useCallback, memo, useMemo } from "react"
import { LeaderboardTableSkeleton } from "@/components/LoadingSkeletons"
import { cn } from "@/lib/utils"
import { get_hunt_leaderboard } from "@/lib/contracts/hunt"
import { getActiveSeason } from "@/lib/seasonStore"
import { logger } from "@/lib/logger"
import Medal from "@/components/icons/Medal"
import { EmptyState } from "@/components/EmptyState"
import { Trophy } from "lucide-react"
import { SeasonInfo } from "@/components/SeasonInfo"
import { useWalletStore } from "@/store/useStore"
import { detectRankChanges } from "@/lib/notifications/rankTracker"
import { handleRankNotifications } from "@/lib/notifications/notificationService"
import type { LeaderboardDisplayEntry, LeaderboardFilters } from "@/lib/types"
import type { LeaderboardEntry } from "@/lib/types"

const DEFAULT_FILTERS: LeaderboardFilters = {
  timePeriod: "all",
  category: "all",
  difficulty: "all",
  metric: "points",
}

function getTimeCutoff(period: LeaderboardFilters["timePeriod"]): number {
  const now = Math.floor(Date.now() / 1000)
  if (period === "today") return now - 86400
  if (period === "week") return now - 86400 * 7
  if (period === "month") return now - 86400 * 30
  return 0
}

interface LeaderboardTableProps {
  huntId?: number
  data?: LeaderboardDisplayEntry[]
  isLoading?: boolean
  huntTitle?: string
  filters?: Partial<LeaderboardFilters>
}

function LeaderboardTableComponent({ huntId, data: initialData, isLoading: initialLoading = false, huntTitle, filters: filterOverrides }: LeaderboardTableProps) {
  const filters: LeaderboardFilters = { ...DEFAULT_FILTERS, ...filterOverrides }

  const [rawData, setRawData] = useState(initialData || [])
  const [isLoading, setIsLoading] = useState(initialLoading)
  const [error, setError] = useState<string | null>(null)
  const [activeSeason, setActiveSeason] = useState<ReturnType<typeof getActiveSeason>>(null)
  const walletAddress = useWalletStore((s: { walletAddress: string }) => s.walletAddress)

  const truncateAddress = (address: string) => {
    if (address.length <= 8) return address
    return `${address.slice(0, 3)}...${address.slice(-3)}`
  }

  const fetchLeaderboard = useCallback(async () => {
    if (huntId === undefined) return

    try {
      if (rawData.length === 0) setIsLoading(true)

      const fetched = await get_hunt_leaderboard(huntId)

      // Detect rank changes and fire notifications using previous state
      if (walletAddress && huntTitle) {
        try {
          const rankChanges = detectRankChanges(huntId, huntTitle, walletAddress, rawData as unknown as LeaderboardEntry[])
          if (rankChanges.length > 0) {
            handleRankNotifications(rankChanges)
          }
        } catch (err) {
          logger.error("Failed to detect rank changes:", err)
        }
      }

      const mapped: LeaderboardDisplayEntry[] = fetched.map((entry, index) => ({
        position: index + 1,
        name: entry.name || truncateAddress(entry.address),
        points: entry.points,
        completionCount: entry.completionCount,
        completedAt: entry.completedAt,
        category: entry.category,
        difficulty: entry.difficulty,
        icon: <Medal position={index + 1} />,
      }))

      setRawData(mapped)
      setError(null)
    } catch (err) {
      logger.error("Failed to fetch leaderboard:", err)
      setError("Failed to load leaderboard data.")
    } finally {
      setIsLoading(false)
    }
  }, [huntId, rawData.length, walletAddress, huntTitle])

  useEffect(() => {
    if (huntId !== undefined) {
      fetchLeaderboard()
      const interval = setInterval(fetchLeaderboard, 30000)
      return () => clearInterval(interval)
    }
  }, [huntId, fetchLeaderboard])

  useEffect(() => {
    setActiveSeason(getActiveSeason())
  }, [])

  const data = useMemo(() => {
    const cutoff = getTimeCutoff(filters.timePeriod)

    let filtered = rawData.filter((entry) => {
      if (filters.timePeriod !== "all" && entry.completedAt !== undefined && entry.completedAt < cutoff) return false
      if (filters.category !== "all" && entry.category !== filters.category) return false
      if (filters.difficulty !== "all" && entry.difficulty !== filters.difficulty) return false
      return true
    })

    if (filters.metric === "completions") {
      filtered = [...filtered].sort((a, b) => (b.completionCount ?? 0) - (a.completionCount ?? 0))
    } else {
      filtered = [...filtered].sort((a, b) => b.points - a.points)
    }

    return filtered.map((entry, index) => ({ ...entry, position: index + 1, icon: <Medal position={index + 1} /> }))
  }, [rawData, filters])

  const containerClass = "rounded-none max-w-2xl mx-auto"

  if (error) {
    return (
      <div className={cn(containerClass, "p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900/30")}>
        <p className="text-red-500 dark:text-red-400 font-medium">{error}</p>
        <button
          onClick={() => fetchLeaderboard()}
          className="mt-4 text-sm text-[#3737A4] dark:text-blue-400 hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!isLoading && data.length === 0) {
    return (
      <div className={cn(containerClass, "p-0")}>
        <EmptyState
          icon={<Trophy className="w-10 h-10 text-slate-500 dark:text-slate-400" />}
          title="No results for these filters"
          description="Try adjusting the time period, category, or difficulty to see more players."
          action={{ label: "Clear filters", href: "/leaderboard" }}
        />
      </div>
    )
  }

  const metricLabel = filters.metric === "completions" ? "Completions" : "Points Won"

  return (
    <div className={containerClass}>
      {activeSeason && (
        <div className="mb-4">
          <SeasonInfo season={activeSeason} showRewards={false} />
        </div>
      )}
      <table className="w-full rounded-none border-l border-[#808080] dark:border-slate-700 border-collapse">
        <thead>
          <tr className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white">
            <th className="px-4 py-2 text-center border border-r-2 border-white">Position</th>
            <th className="px-4 py-2 text-left border border-r-2 border-white">Display Name / Wallet Address</th>
            <th className="px-4 py-2 text-center">{metricLabel}</th>
          </tr>
        </thead>
        <tbody>
          {(isLoading && data.length === 0) ? (
            <LeaderboardTableSkeleton />
          ) : (
            data.map((entry, index) => {
              const isTop3 = entry.position <= 3
              const rowClass = isTop3 ? "bg-slate-50 dark:bg-blue-900/10 font-bold" : "bg-white dark:bg-slate-900"

              return (
                <tr key={index} className={rowClass}>
                  <td className="px-4 py-2 flex items-center justify-center gap-2 text-center border-r-2 border-[#808080] dark:border-slate-700 border-b-2">
                    <span>{entry.icon}</span>
                    <span className="text-[16px] bg-gradient-to-b from-[#576065] to-[#787884] dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">{entry.position}</span>
                  </td>
                  <td className="px-4 py-2 border-r-2 border-[#808080] dark:border-slate-700 border-b-2 text-[16px] bg-gradient-to-b from-[#576065] to-[#787884] dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">{entry.name}</td>
                  <td className="px-4 py-2 text-center border border-b-2 border-[#808080] dark:border-slate-700 text-[16px] bg-gradient-to-b from-[#576065] to-[#787884] dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                    {filters.metric === "completions" ? (entry.completionCount ?? 0) : entry.points}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

export const LeaderboardTable = memo(LeaderboardTableComponent)
