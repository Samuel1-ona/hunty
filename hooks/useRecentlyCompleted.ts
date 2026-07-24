"use client"

import { useMemo } from "react"
import type { StoredHunt } from "@/lib/types"

/** Maximum number of completed hunts shown in the Recently Completed strip. */
export const MAX_RECENTLY_COMPLETED = 5

/**
 * Derives the most recently completed hunts from the hunt list already
 * fetched by the arcade page — no additional RPC call.
 *
 * Filters to `status === "Completed"` and non-private hunts, sorts by
 * `endTime` descending (most recently ended first), then slices to
 * `MAX_RECENTLY_COMPLETED`. Slicing is the hook's responsibility so the
 * cap is easy to change in one place and the component stays dumb.
 *
 * @param hunts - Full hunt list from the arcade page's existing query.
 * @returns Up to MAX_RECENTLY_COMPLETED completed hunts, newest first.
 */
export function useRecentlyCompleted(hunts: StoredHunt[]): StoredHunt[] {
  return useMemo(
    () =>
      hunts
        .filter((h) => h.status === "Completed" && !h.is_private)
        .sort((a, b) => (b.endTime ?? 0) - (a.endTime ?? 0))
        .slice(0, MAX_RECENTLY_COMPLETED),
    [hunts]
  )
}
