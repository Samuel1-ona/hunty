"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

import { WalletAddress } from "@/components/WalletAddress"
import { WalletIdenticon } from "@/components/WalletIdenticon"
import { Skeleton } from "@/components/ui/skeleton"
import { queryCachePolicy, queryKeys } from "@/lib/queryKeys"
import type { StoredProgressEntry } from "@/lib/progressData"

const PLAYER_PAGE_SIZE = 20
const SCROLL_THRESHOLD_PX = 200

interface PlayersResponse {
  data: StoredProgressEntry[]
  pagination: {
    total: number
    limit: number
    cursor: number | null
    nextCursor: number | null
  }
}

interface HuntPlayersProps {
  huntId: number
  filter?: string | null
}

export function HuntPlayers({ huntId, filter = null }: HuntPlayersProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: queryKeys.hunt.players(huntId, filter),
    queryFn: async ({ pageParam }) => {
      const cursorVal = pageParam !== null && pageParam !== undefined ? String(pageParam) : ""
      const params = new URLSearchParams({ limit: String(PLAYER_PAGE_SIZE) })
      if (cursorVal) params.set("cursor", cursorVal)
      if (filter) params.set("filter", filter)

      const res = await fetch(`/api/v1/hunts/${huntId}/players?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`Failed to load players (${res.status})`)
      }
      return (await res.json()) as PlayersResponse
    },
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    staleTime: queryCachePolicy.huntPlayers.staleTime,
    gcTime: queryCachePolicy.huntPlayers.gcTime,
  })

  // Infinite scroll: observe the sentinel and fetch more on intersection
  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasNextPage || isFetchingNextPage || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage()
        }
      },
      { rootMargin: `${SCROLL_THRESHOLD_PX}px`, threshold: 0 },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage])

  const players = data?.pages.flatMap((page) => page.data) ?? []
  const total = data?.pages[0]?.pagination.total ?? 0

  if (error instanceof Error) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        Unable to load players.
      </div>
    )
  }

  if (isLoading && players.length === 0) {
    return (
      <div className="space-y-1">
        {Array.from({ length: PLAYER_PAGE_SIZE }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        No players have registered for this hunt yet.
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        Showing {players.length} of {total} players
      </p>
      <div className="space-y-1">
        {players.map((player, index) => (
          <PlayerRow key={`${player.wallet}-${index}`} player={player} position={index + 1} />
        ))}
      </div>

      {hasNextPage && (
        <div ref={loadMoreRef} className="py-4 flex justify-center">
          {isFetchingNextPage && (
            <Skeleton className="h-5 w-32 rounded-full" />
          )}
        </div>
      )}
    </div>
  )
}

interface PlayerRowProps {
  player: StoredProgressEntry
  position: number
}

function PlayerRow({ player, position }: PlayerRowProps) {
  const cluesSolved = player.completedClueIds?.length ?? 0

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-white dark:bg-slate-900 px-4 py-2.5 border border-slate-200 dark:border-white/5">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-slate-500 dark:text-slate-400 text-sm font-mono w-8 text-center">
          #{position}
        </span>
        <WalletIdenticon address={player.wallet} size={28} className="flex-shrink-0" />
        <div className="flex flex-col min-w-0">
          <WalletAddress
            address={player.wallet}
            showIdenticon={false}
            addressClassName="text-sm text-slate-700 dark:text-slate-200"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {cluesSolved}/{player.totalClues} clues solved
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-right">
        <div>
          <span className="text-lg font-semibold text-slate-900 dark:text-white">
            {player.totalPoints}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">pts</span>
        </div>
        {player.completed && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
            Completed
          </span>
        )}
      </div>
    </div>
  )
}
