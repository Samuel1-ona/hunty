"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import React from "react";

interface PlayerProgressPanelProps {
  cluesSolved: number;
  totalClues: number;
  totalPoints: number;
  /** One-based step currently being presented. */
  currentStep?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
}

export const PlayerProgressPanel: React.FC<PlayerProgressPanelProps> = ({
  cluesSolved,
  totalClues,
  totalPoints,
  currentStep,
  onPrevious,
  onNext,
  nextDisabled = false,
}) => {
  const percentage = totalClues > 0 ? Math.round((cluesSolved / totalClues) * 100) : 0;
  const step = currentStep ?? Math.min(cluesSolved + 1, totalClues);

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200 dark:border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Total Points
          </span>
        </div>
        <span className="text-lg font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
          {totalPoints}
        </span>
      </div>

      <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
        <span
          className="text-sm font-semibold text-slate-700 dark:text-slate-200"
          data-testid="current-step"
        >
          Step {step} of {totalClues}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-700"
            aria-label="Previous clue"
            disabled={!onPrevious || step <= 1}
            onClick={onPrevious}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-700"
            aria-label="Next clue"
            disabled={!onNext || nextDisabled}
            onClick={onNext}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm text-slate-600 dark:text-slate-400">Clues Solved</span>
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {cluesSolved}/{totalClues}
        </span>
      </div>

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

      <p className="text-xs text-slate-400 dark:text-slate-500 text-right mt-1">
        {percentage}% complete
      </p>
    </div>
  );
};
