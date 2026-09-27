"use client"

import React, { useEffect, useState } from "react"
import { CompletedHuntCard } from "@/components/CompletedHuntCard"
import { get_hunt_leaderboard } from "@/lib/contracts/hunt"
import type { StoredHunt } from "@/lib/types"

interface RecentlyCompletedSectionProps {
  hunts: StoredHunt[]
}

/**
 * Renders a horizontally scrollable strip of recently completed hunts.
 *
 * Returns `null` (not an empty container) when `hunts` is empty — an empty
 * section with a heading but no cards looks broken.
 *
 * Winner addresses are fetched in parallel via `Promise.allSettled` after
 * mount. A failed leaderboard fetch for one hunt does not affect the others;
 * the card simply renders without a winner line.
 *
 * The scroll container uses `overflow-x: auto` with focusable card children,
 * giving native keyboard arrow-key scrolling when the container is focused.
 */
export function RecentlyCompletedSection({ hunts }: RecentlyCompletedSectionProps) {
  // Map of huntId → top winner address (populated async after mount)
  const [winners, setWinners] = useState<Map<number, string>>(new Map())

  useEffect(() => {
    if (hunts.length === 0) return

    void Promise.allSettled(
      hunts.map(async (hunt) => {
        const entries = await get_hunt_leaderboard(hunt.id)
        // Sort descending by points; take the top address
        const sorted = [...entries].sort((a, b) => b.points - a.points)
        const top = sorted[0]
        return top ? { id: hunt.id, address: top.address } : null
      })
    ).then((results) => {
      const next = new Map<number, string>()
      results.forEach((outcome) => {
        if (outcome.status === "fulfilled" && outcome.value) {
          next.set(outcome.value.id, outcome.value.address)
        }
      })
      setWinners(next)
    })
  }, [hunts])

  // Constraint: return null, not an empty container
  if (hunts.length === 0) return null

  return (
    <section aria-label="Recently completed hunts" className="mt-10">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500 mb-1">
          Recently completed
        </p>
        <h2 className="text-2xl font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent">
          Finished Hunts
        </h2>
      </div>

      {/*
        overflow-x: auto + focusable children = native keyboard arrow-key
        scrolling when the container or a child has focus.
        tabIndex={0} makes the container itself focusable as a fallback.
      */}
      <div
        className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3737A4] rounded-2xl"
        tabIndex={0}
        role="region"
        aria-label="Scroll to see more completed hunts"
      >
        <div className="inline-flex gap-4 pb-2">
          {hunts.map((hunt) => (
            <CompletedHuntCard
              key={hunt.id}
              hunt={hunt}
              winnerAddress={winners.get(hunt.id)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
