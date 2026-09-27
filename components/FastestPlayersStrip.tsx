"use client"

import { useCallback, useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import Medal from "@/components/icons/Medal"
import { get_hunt_fastest_players } from "@/lib/contracts/hunt"
import type { FastestPlayerDisplayEntry } from "@/lib/types"
import { logger } from "@/lib/logger"

interface FastestPlayersStripProps {
  huntId: number
}

const truncateAddress = (address: string) => {
  if (address.length <= 10) return address
  return `${address.slice(0, 5)}...${address.slice(-4)}`
}

const formatDuration = (seconds: number) => {
  const hh = Math.floor(seconds / 3600)
  const mm = Math.floor((seconds % 3600) / 60)
  const ss = seconds % 60

  if (hh > 0) {
    return `${hh}h ${mm.toString().padStart(2, "0")}m`
  }

  return `${mm.toString().padStart(2, "0")}m ${ss.toString().padStart(2, "0")}s`
}

export function FastestPlayersStrip({ huntId }: FastestPlayersStripProps) {
  const [data, setData] = useState<FastestPlayerDisplayEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const hasIndexer = Boolean(process.env.NEXT_PUBLIC_TORII_INDEXER_URL)

  const fetchFastestPlayers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const rawPlayers = await get_hunt_fastest_players(huntId)
      const sorted = [...rawPlayers].sort((a, b) => a.completionTimeSeconds - b.completionTimeSeconds)
      const mapped: FastestPlayerDisplayEntry[] = sorted.map((player, index) => ({
        position: index + 1,
        name: player.name || truncateAddress(player.address),
        completionTimeLabel: formatDuration(player.completionTimeSeconds),
        points: player.points,
        icon: <Medal position={index + 1} />,
      }))

      setData(mapped)
    } catch (err) {
      logger.error("Failed to fetch fastest players:", err)
      setError("Unable to load fastest players right now.")
    } finally {
      setIsLoading(false)
    }
  }, [huntId])

  useEffect(() => {
    fetchFastestPlayers()
    const interval = setInterval(fetchFastestPlayers, 30000)
    return () => clearInterval(interval)
  }, [fetchFastestPlayers])

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-400 mb-1">Fastest players</p>
          <h2 className="text-2xl font-semibold text-white">Fastest Hunt Finishers</h2>
        </div>
        <p className="text-sm text-slate-400">
          {hasIndexer
            ? "Polling Torii indexer for live completion times."
            : "Using leaderboard fallback. Enable Torii indexer for live completion tracking."}
        </p>
      </div>

      <div className="overflow-x-auto no-scrollbar border border-white/10 rounded-3xl bg-white/5 p-4">
        <div className="inline-flex min-w-full gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="min-w-[220px] flex-shrink-0 rounded-3xl border border-slate-700/60 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/20">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <Skeleton className="h-8 w-8 rounded-full bg-slate-700" />
                    <Skeleton className="h-4 w-16 rounded-full bg-slate-700" />
                  </div>
                  <Skeleton className="mb-3 h-5 w-36 rounded-full bg-slate-700" />
                  <Skeleton className="h-4 w-24 rounded-full bg-slate-700" />
                </div>
              ))
            : error
            ? (
              <div className="min-w-full rounded-3xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-100">
                {error}
              </div>
            )
            : data.length === 0
            ? (
              <div className="min-w-full rounded-3xl border border-dashed border-slate-600/50 bg-slate-950/50 p-6 text-slate-300">
                No completed hunts found yet. Be the first to finish and appear here.
              </div>
            )
            : data.map((entry) => (
              <div key={entry.position} className="min-w-[220px] flex-shrink-0 rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-lg shadow-slate-950/30">
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#D9A700] via-[#FFCE55] to-[#F4F0CB] text-slate-950 shadow-sm">
                    {entry.position}
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Finisher</p>
                    <p className="text-base font-semibold text-white">{entry.name}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-3xl bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Time</p>
                    <p className="mt-1 text-lg font-semibold text-white">{entry.completionTimeLabel}</p>
                  </div>
                  {entry.points !== undefined && (
                    <div className="rounded-3xl bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Points</p>
                      <p className="mt-1 text-lg font-semibold text-white">{entry.points}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  )
}
