/**
 * Findings (Issue #358):
 *
 * - No on-chain get_player_count method exists on the PlayerRegistration contract.
 *   The app tracks registrations in localStorage as:
 *   `hunt_registered_{huntId}_{playerAddress} = "true"`
 *   This hook counts those keys for a given huntId — consistent with how
 *   getPlayerProgress and registerPlayer work in lib/contracts/player-registration.ts.
 *
 * - Data-fetching pattern: useEffect + useState (matches useXlmUsdPrice.ts).
 *   No new library introduced.
 *
 * - Cache: module-level Map keyed by huntId with TTL (PLAYER_COUNT_CACHE_TTL_MS).
 *   Persists across re-renders; resets on full page reload — satisfying the
 *   "updates on each arcade page load" requirement without stale counts surviving
 *   navigation.
 *
 * - On error: returns { count: 0, isTrending: false, error: "..." } — never throws.
 *
 * - isTrending = count >= TRENDING_PLAYER_THRESHOLD (50).
 */

"use client"

import { useEffect, useState } from "react"
import { TRENDING_PLAYER_THRESHOLD, PLAYER_COUNT_CACHE_TTL_MS, type PlayerCountResult } from "@/lib/types"

// Module-level cache — survives re-renders, resets on page reload.
const cache = new Map<string, { count: number; fetchedAt: number }>()

/**
 * Counts registered players for a hunt by scanning localStorage keys of the
 * form `hunt_registered_{huntId}_{playerAddress}`.
 */
export function getPlayerCountFromStorage(huntId: string): number {
  if (typeof window === "undefined") return 0
  const prefix = `hunt_registered_${huntId}_`
  let count = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(prefix) && localStorage.getItem(key) === "true") {
      count++
    }
  }
  return count
}

/**
 * Fetch and cache the registered player count for a given hunt.
 *
 * **Data source:** scans `localStorage` for keys of the form
 * `hunt_registered_{huntId}_{address}` with value `"true"` — the same keys
 * written by `registerPlayer` in `lib/contracts/player-registration.ts`.
 *
 * **Caching:** a module-level `Map` keyed by `huntId` stores
 * `{ count, fetchedAt }`. On each call the hook checks whether
 * `Date.now() - fetchedAt < PLAYER_COUNT_CACHE_TTL_MS`. If the entry is
 * fresh the cached value is returned immediately with no localStorage scan.
 * If stale or absent the hook re-scans and updates the cache. Because the
 * cache is module-level it persists across re-renders but resets on a full
 * page reload, satisfying the "updates on each arcade page load" requirement.
 *
 * **No-throw guarantee:** all errors are caught and surfaced in the returned
 * `error` field. A failed count fetch never throws and never breaks the
 * calling component's render.
 *
 * @param huntId - The on-chain hunt identifier (string form of the numeric ID).
 * @returns {@link PlayerCountResult} with count, isTrending, loading, and error state.
 */
export function usePlayerCount(huntId: string): PlayerCountResult {
  const [result, setResult] = useState<PlayerCountResult>({
    huntId,
    count: 0,
    isTrending: false,
    fetchedAt: 0,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    if (!huntId) {
      setResult({ huntId, count: 0, isTrending: false, fetchedAt: 0, isLoading: false, error: "No huntId" })
      return
    }

    const cached = cache.get(huntId)
    if (cached && Date.now() - cached.fetchedAt < PLAYER_COUNT_CACHE_TTL_MS) {
      setResult({
        huntId,
        count: cached.count,
        isTrending: cached.count >= TRENDING_PLAYER_THRESHOLD,
        fetchedAt: cached.fetchedAt,
        isLoading: false,
        error: null,
      })
      return
    }

    // Fetch (synchronous localStorage scan wrapped in try/catch)
    try {
      const count = getPlayerCountFromStorage(huntId)
      const fetchedAt = Date.now()
      cache.set(huntId, { count, fetchedAt })
      setResult({
        huntId,
        count,
        isTrending: count >= TRENDING_PLAYER_THRESHOLD,
        fetchedAt,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      setResult({
        huntId,
        count: 0,
        isTrending: false,
        fetchedAt: 0,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch player count",
      })
    }
  }, [huntId])

  return result
}

/** Exposed for testing and bulk hook use. */
export { cache as playerCountCache }
