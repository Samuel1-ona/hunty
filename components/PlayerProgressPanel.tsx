"use client"

import React from "react"
import { Trophy, CheckCircle2 } from "lucide-react"

interface PlayerProgressPanelProps {
  cluesSolved: number
  totalClues: number
  totalPoints: number
}

export const PlayerProgressPanel: React.FC<PlayerProgressPanelProps> = ({
  cluesSolved,
  totalClues,
  totalPoints,
}) => {
  const percentage = totalClues > 0 ? Math.round((cluesSolved / totalClues) * 100) : 0

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200 dark:border-white/10 p-5">
      {/* Points */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total Points</span>
        </div>
        <span className="text-lg font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
          {totalPoints}
        </span>
      </div>

      {/* Clues solved label */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-sm text-slate-600 dark:text-slate-400">Clues Solved</span>
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {cluesSolved}/{totalClues}
        </span>
      </div>

      {/* Progress bar */}
      <div 
        className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Clues solved progress"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#3737A4] to-[#0C0C4F] dark:from-blue-500 dark:to-indigo-600 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Percentage label */}
      <p className="text-xs text-slate-400 dark:text-slate-500 text-right mt-1">{percentage}% complete</p>
    </div>
  )
}
