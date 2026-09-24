"use client"

import React, { useEffect, useState } from "react"
import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ComputedDifficulty, ComputedDifficultyLabel } from "@hunty/types"

// ─── Styling ─────────────────────────────────────────────────────────────────

const LABEL_STYLES: Record<
  ComputedDifficultyLabel,
  { classes: string; icon: string }
> = {
  Easy: {
    classes:
      "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400",
    icon: "🟢",
  },
  Medium: {
    classes:
      "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400",
    icon: "🟡",
  },
  Hard: {
    classes:
      "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400",
    icon: "🟠",
  },
  Expert: {
    classes: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400",
    icon: "🔴",
  },
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches computed difficulty for a hunt from the API.
 * Returns `null` while loading, on fetch failure, or when `huntId` is nullish.
 */
function useHuntDifficulty(
  huntId: number | string | null | undefined,
): ComputedDifficulty | null {
  const [data, setData] = useState<ComputedDifficulty | null>(null)

  useEffect(() => {
    // Skip the fetch when no id is provided (e.g. pre-fetched prop path).
    if (huntId === null || huntId === undefined || huntId === "") return

    let cancelled = false
    fetch(`/api/v1/hunts/${huntId}/difficulty`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: ComputedDifficulty | null) => {
        if (!cancelled && json) setData(json)
      })
      .catch(() => {
        // Swallow network errors — the badge simply won't render.
      })
    return () => {
      cancelled = true
    }
  }, [huntId])

  return data
}

// ─── Component ───────────────────────────────────────────────────────────────

interface DifficultyBadgeProps {
  /**
   * The hunt ID to fetch difficulty for.
   * When `difficulty` is also provided it is used directly and no fetch occurs.
   */
  huntId?: number | string
  /**
   * Pre-fetched difficulty payload. When provided the API call is skipped.
   * Useful when the parent already has the data (e.g. a server component).
   */
  difficulty?: ComputedDifficulty
  className?: string
}

/**
 * Renders a small pill badge showing the computed difficulty of a hunt.
 *
 * - Fetches `/api/v1/hunts/:huntId/difficulty` client-side, or accepts a
 *   pre-fetched `difficulty` prop.
 * - Displays a `~` prefix when the result is provisional (`reliable: false`)
 *   so players know the label may still shift.
 * - Returns `null` while loading or on fetch failure, keeping the hunt card
 *   layout stable.
 */
export function DifficultyBadge({
  huntId,
  difficulty: difficultyProp,
  className,
}: DifficultyBadgeProps) {
  // Skip the fetch when the caller already has the data.
  const fetched = useHuntDifficulty(difficultyProp !== undefined ? null : (huntId ?? null))
  const difficulty = difficultyProp ?? fetched

  if (!difficulty) return null

  const { label, reliable } = difficulty
  const style = LABEL_STYLES[label]
  const displayLabel = reliable ? label : `~${label}`

  return (
    <span
      aria-label={`Difficulty: ${displayLabel}${reliable ? "" : " (provisional)"}`}
      title={
        reliable
          ? `Computed difficulty: ${label}`
          : `Provisional difficulty (fewer than 5 completions): ${label}`
      }
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        style.classes,
        className,
      )}
    >
      <Flame className="w-3 h-3" aria-hidden="true" />
      {displayLabel}
    </span>
  )
}
