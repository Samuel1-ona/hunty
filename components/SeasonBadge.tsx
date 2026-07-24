"use client"

import React from "react"
import { Award } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SeasonBadge as SeasonBadgeType } from "@/lib/types"

interface SeasonBadgeProps {
  badge: SeasonBadgeType
  className?: string
  showRank?: boolean
}

export function SeasonBadge({ badge, className, showRank = true }: SeasonBadgeProps) {
  const getRankColor = (rank?: number) => {
    if (!rank) return "bg-slate-500"
    if (rank === 1) return "bg-yellow-500"
    if (rank === 2) return "bg-gray-400"
    if (rank === 3) return "bg-amber-700"
    return "bg-slate-500"
  }

  const getRankLabel = (rank?: number) => {
    if (!rank) return ""
    const suffixes = ["th", "st", "nd", "rd"]
    const suffix = rank <= 3 ? suffixes[rank] : suffixes[0]
    return `${rank}${suffix}`
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#3737A4] to-[#0C0C4F] text-white text-sm font-medium shadow-sm",
        className
      )}
    >
      <Award className="w-4 h-4" />
      <span>{badge.seasonName}</span>
      {showRank && badge.rank && (
        <>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1">
            <span className={cn("w-2 h-2 rounded-full", getRankColor(badge.rank))} />
            <span>{getRankLabel(badge.rank)}</span>
          </span>
        </>
      )}
    </div>
  )
}
