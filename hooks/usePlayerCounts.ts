"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { TRENDING_PLAYER_THRESHOLD, PLAYER_COUNT_CACHE_TTL_MS, type PlayerCountResult } from "@/lib/types"
import { getPlayerCountFromStorage, playerCountCache } from "./usePlayerCount"

function buildResult(huntId: string, count: number, fetchedAt: number): PlayerCountResult {
  return {
    huntId,
    count,
    isTrending: count >= TRENDING_PLAYER_THRESHOLD,
    fetchedAt,
    isLoading: false,
    error: null,
  }
}

function buildErrorResult(huntId: string, err: unknown): PlayerCountResult {
  return {
    huntId,
    count: 0,
    isTrending: false,
    fetchedAt: 0,
    isLoading: false,
    error: err instanceof Error ? err.message : "Failed to fetch player count",
  }
}

/**
 * Fetch player counts for multiple hunts in parallel, sharing the same
 * module-level TTL cache as {@link usePlayerCount}.
 *
 * **Parallel fetching:** only hunt IDs that are absent from the cache or
 * whose cached entry has expired are fetched. Those IDs are dispatched
 * concurrently via `Promise.allSettled`, so a slow or failing fetch for one
 * hunt does not delay or block the others.
 *
 * **Partial failure handling:** if an individual fetch throws, its
 * `PlayerCountResult` is populated with `{ count: 0, error: "..." }` while
 * all other results resolve normally. The hook itself never rejects.
 *
 * **Usage:** call at the page level (e.g. the arcade page) and pass the
 * per-hunt results down as props to avoid N individual hook calls inside
 * each card.
 *
 * @param huntIds - Array of hunt IDs visible on the current page.
 * @returns `counts` map, `isLoading` flag, and a `refetch` function that
 *   clears the cache for these IDs and re-fetches — call on page mount/focus.
 */
export function usePlayerCounts(huntIds: string[]): {
  counts: Map<string, PlayerCountResult>
  isLoading: boolean
  refetch: () => void
} {
  const [counts, setCounts] = useState<Map<string, PlayerCountResult>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  // Stable ref to avoid stale closure in refetch
  const huntIdsRef = useRef(huntIds)
  huntIdsRef.current = huntIds

  const fetchCounts = useCallback(async (ids: string[], forceRefresh = false) => {
    if (ids.length === 0) return

    if (forceRefresh) {
      ids.forEach((id) => playerCountCache.delete(id))
    }

    const now = Date.now()
    const staleIds = ids.filter((id) => {
      const cached = playerCountCache.get(id)
      return !cached || now - cached.fetchedAt >= PLAYER_COUNT_CACHE_TTL_MS
    })

    // Seed with cached values immediately
    const next = new Map<string, PlayerCountResult>()
    ids.forEach((id) => {
      const cached = playerCountCache.get(id)
      if (cached && now - cached.fetchedAt < PLAYER_COUNT_CACHE_TTL_MS) {
        next.set(id, buildResult(id, cached.count, cached.fetchedAt))
      } else {
        next.set(id, { huntId: id, count: 0, isTrending: false, fetchedAt: 0, isLoading: true, error: null })
      }
    })
    setCounts(new Map(next))

    if (staleIds.length === 0) return

    setIsLoading(true)

    const settled = await Promise.allSettled(
      staleIds.map(async (id) => {
        const count = getPlayerCountFromStorage(id)
        const fetchedAt = Date.now()
        playerCountCache.set(id, { count, fetchedAt })
        return { id, count, fetchedAt }
      })
    )

    setCounts((prev) => {
      const updated = new Map(prev)
      settled.forEach((outcome, i) => {
        const id = staleIds[i]
        if (outcome.status === "fulfilled") {
          updated.set(id, buildResult(id, outcome.value.count, outcome.value.fetchedAt))
        } else {
          updated.set(id, buildErrorResult(id, outcome.reason))
        }
      })
      return updated
    })

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void fetchCounts(huntIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [huntIds.join(",")])

  const refetch = useCallback(() => {
    void fetchCounts(huntIdsRef.current, true)
  }, [fetchCounts])

  return { counts, isLoading, refetch }
}
