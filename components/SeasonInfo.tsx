"use client"

import React from "react"
import { Calendar, Trophy, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { SeasonCountdown } from "./SeasonCountdown"
import type { Season } from "@/lib/types"

interface SeasonInfoProps {
  season: Season
  className?: string
  showRewards?: boolean
}

export function SeasonInfo({ season, className, showRewards = true }: SeasonInfoProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStatusColor = (status: Season["status"]) => {
    switch (status) {
      case "Active":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
      case "Ended":
        return "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20"
      case "Upcoming":
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
      default:
        return "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20"
    }
  }

  return (
    <div className={cn("rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4", className)}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{season.name}</h3>
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1",
              getStatusColor(season.status)
            )}
          >
            {season.status}
          </span>
        </div>
        {season.status === "Active" && (
          <SeasonCountdown endTime={season.endTime} />
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <Calendar className="w-4 h-4" />
          <span>
            {formatDate(season.startTime)} - {formatDate(season.endTime)}
          </span>
        </div>

        {showRewards && season.rewards && season.rewards.length > 0 && (
          <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
            <Trophy className="w-4 h-4 mt-0.5" />
            <div>
              <span className="font-medium">Rewards:</span>
              <ul className="mt-1 space-y-0.5">
                {season.rewards.slice(0, 5).map((reward) => (
                  <li key={reward.place} className="text-xs">
                    {reward.place}
                    {reward.place === 1 ? "st" : reward.place === 2 ? "nd" : reward.place === 3 ? "rd" : "th"} place:{" "}
                    <span className="font-semibold text-[#3737A4] dark:text-blue-400">{reward.amount} XLM</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
