"use client"

import React from "react"
import Link from "next/link"
import { HuntCoverImage } from "@/components/HuntCoverImage"
import type { StoredHunt } from "@/lib/types"

interface CompletedHuntCardProps {
  hunt: StoredHunt
  /**
   * Full Stellar G-address of the top-ranked player.
   * Raw address is never shown as visible text — always truncated.
   * The full address is accessible via `title` and `aria-label`.
   * Omit while the leaderboard is still loading.
   */
  winnerAddress?: string
}

/** Truncates a Stellar address to `G…XXXX` form (5 + 4 chars). */
function truncateAddress(address: string): string {
  if (address.length <= 10) return address
  return `${address.slice(0, 5)}…${address.slice(-4)}`
}

function rewardBadgeClass(rewardType: StoredHunt["rewardType"]): string {
  if (rewardType === "XLM") return "bg-green-50 text-green-700"
  if (rewardType === "NFT") return "bg-purple-50 text-purple-700"
  return "bg-amber-50 text-amber-700"
}

export function CompletedHuntCard({ hunt, winnerAddress }: CompletedHuntCardProps) {
  return (
    <article
      className="min-w-[220px] max-w-[260px] flex-shrink-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden"
      aria-label={`Completed hunt: ${hunt.title}`}
    >
      <HuntCoverImage
        src={hunt.coverImageCid}
        alt={`${hunt.title} cover`}
        className="relative w-full h-32 bg-slate-100"
      />

      <div className="p-4 flex flex-col gap-2">
        {/* Title */}
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
          {hunt.title}
        </h3>

        {/* Metadata row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
            {hunt.cluesCount} {hunt.cluesCount === 1 ? "clue" : "clues"}
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${rewardBadgeClass(hunt.rewardType)}`}>
            {hunt.rewardType}
          </span>
          {/* Completed badge */}
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            ✓ Completed
          </span>
        </div>

        {/* Winner row — only rendered when address is available */}
        {winnerAddress && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span aria-hidden="true">🏆</span>
            <span
              title={winnerAddress}
              aria-label={`Winner: ${winnerAddress}`}
              className="font-mono"
            >
              {truncateAddress(winnerAddress)}
            </span>
          </p>
        )}

        {/* CTA */}
        <Link
          href={`/hunt/${hunt.id}`}
          className="mt-1 text-[11px] font-semibold text-[#3737A4] dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3737A4] rounded"
        >
          View results →
        </Link>
      </div>
    </article>
  )
}
