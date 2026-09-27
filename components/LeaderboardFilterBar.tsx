"use client"

import { cn } from "@/lib/utils"
import type { LeaderboardFilters, LeaderboardTimePeriod, LeaderboardMetric } from "@/lib/types"
import type { ClueDifficulty } from "@/lib/types"

const TIME_PERIODS: { value: LeaderboardTimePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
]

const HUNT_CATEGORIES = ["Outdoor", "Onboarding", "Trivia", "Campus", "Indoor", "Community"]

const DIFFICULTIES: { value: ClueDifficulty | "all"; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "Easy", label: "Easy" },
  { value: "Medium", label: "Medium" },
  { value: "Hard", label: "Hard" },
]

interface LeaderboardFilterBarProps {
  filters: LeaderboardFilters
  onChange: (updated: Partial<LeaderboardFilters>) => void
  className?: string
}

export function LeaderboardFilterBar({ filters, onChange, className }: LeaderboardFilterBarProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Time period */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-20 shrink-0">Period</span>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-0.5">
          {TIME_PERIODS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onChange({ timePeriod: value })}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                filters.timePeriod === value
                  ? "bg-white dark:bg-slate-700 text-[#3737A4] shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-20 shrink-0">Category</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onChange({ category: "all" })}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold border transition-all",
              filters.category === "all"
                ? "bg-[#3737A4] text-white border-[#3737A4]"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-[#3737A4]"
            )}
          >
            All
          </button>
          {HUNT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onChange({ category: cat })}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold border transition-all",
                filters.category === cat
                  ? "bg-[#3737A4] text-white border-[#3737A4]"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-[#3737A4]"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty + Metric toggle */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-20 shrink-0">Difficulty</span>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-0.5">
            {DIFFICULTIES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => onChange({ difficulty: value })}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                  filters.difficulty === value
                    ? "bg-white dark:bg-slate-700 text-[#3737A4] shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">Rank by</span>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-0.5">
            {(["points", "completions"] as LeaderboardMetric[]).map((m) => (
              <button
                key={m}
                onClick={() => onChange({ metric: m })}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-semibold transition-all capitalize",
                  filters.metric === m
                    ? "bg-white dark:bg-slate-700 text-[#3737A4] shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
