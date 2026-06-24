"use client"

import React, { useEffect, useState, useCallback, memo } from "react"
import { LeaderboardTableSkeleton } from "@/components/LoadingSkeletons"
import { cn } from "@/lib/utils"
import { get_hunt_leaderboard } from "@/lib/contracts/hunt"
import { logger } from "@/lib/logger"
import Medal from "@/components/icons/Medal"
import { EmptyState } from "@/components/EmptyState"
import { Trophy } from "lucide-react"
import type { LeaderboardDisplayEntry } from "@/lib/types"

interface LeaderboardTableProps {
  huntId?: number
  data?: LeaderboardDisplayEntry[]
  isLoading?: boolean
}

function LeaderboardTableComponent({ huntId, data: initialData, isLoading: initialLoading = false }: LeaderboardTableProps) {
  const [data, setData] = useState<LeaderboardDisplayEntry[]>(initialData || [])
  const [isLoading, setIsLoading] = useState(initialLoading)
  const [error, setError] = useState<string | null>(null)

  const truncateAddress = (address: string) => {
    if (address.length <= 8) return address
    return `${address.slice(0, 3)}...${address.slice(-3)}`
  }

  const fetchLeaderboard = useCallback(async () => {
    if (huntId === undefined) return

    try {
      // Only set loading on initial fetch to avoid flickering during polling
      if (data.length === 0) setIsLoading(true)

      const rawData = await get_hunt_leaderboard(huntId)

      // Sort by points descending (Requirement: Do not assume contract returns pre-sorted)
      const sortedData = [...rawData].sort((a, b) => b.points - a.points)

      // Map to UI-friendly format (Requirement: Truncate wallet if no name)
      const mappedData: LeaderboardDisplayEntry[] = sortedData.map((entry, index) => ({
        position: index + 1,
        name: entry.name || truncateAddress(entry.address),
        points: entry.points,
        icon: <Medal position={index + 1} /> // Requirement: Top 3 Highlighting via Medal icons
      }))

      setData(mappedData)
      setError(null)
    } catch (err) {
      logger.error("Failed to fetch leaderboard:", err)
      setError("Failed to load leaderboard data.")
    } finally {
      setIsLoading(false)
    }
  }, [huntId, data.length])

  useEffect(() => {
    if (huntId !== undefined) {
      fetchLeaderboard()
      const interval = setInterval(fetchLeaderboard, 30000) // Requirement: 30-second polling
      return () => clearInterval(interval)
    }
  }, [huntId, fetchLeaderboard])

  const containerClass = "rounded-none max-w-2xl mx-auto";

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
          title="Be the first to complete!"
          description="No players have finished this leaderboard yet. Jump into a hunt to claim the top spot."
          action={{ label: "Explore hunts", href: "/" }}
        />
      </div>
    )
  }

  return (
    <div className={containerClass}>
      <table className="w-full rounded-none border-l border-[#808080] dark:border-slate-700 border-collapse">
        <thead>
          <tr className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white">
            <th className="px-4 py-2 text-center border border-r-2 border-white">Position</th>
            <th className="px-4 py-2 text-left border border-r-2 border-white">Display Name / Wallet Address</th>
            <th className="px-4 py-2 text-center">Points Won</th>
          </tr>
        </thead>
        <tbody>
          {(isLoading && data.length === 0) ? (
            <LeaderboardTableSkeleton />
          ) : (
            data.map((entry, index) => {
              // Requirement: Visually distinguish rank 1, 2, and 3
              const isTop3 = entry.position <= 3;
              const rowClass = isTop3 ? "bg-slate-50 dark:bg-blue-900/10 font-bold" : "bg-white dark:bg-slate-900";

              return (
                <tr key={index} className={rowClass}>
                  <td className="px-4 py-2 flex items-center justify-center gap-2 text-center border-r-2 border-[#808080] dark:border-slate-700 border-b-2 ">
                    <span>{entry.icon}</span>
                    <span className="text-[16px] bg-gradient-to-b from-[#576065] to-[#787884] dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">{entry.position}</span>
                  </td>
                  <td className="px-4 py-2 border-r-2 border-[#808080] dark:border-slate-700 border-b-2 text-[16px] bg-gradient-to-b from-[#576065] to-[#787884] dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">{entry.name}</td>
                  <td className="px-4 py-2 text-center border border-b-2 border-[#808080] dark:border-slate-700 text-[16px] bg-gradient-to-b from-[#576065] to-[#787884] dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">{entry.points}</td>
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
