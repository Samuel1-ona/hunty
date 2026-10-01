"use client";

import { CheckCircle2 } from "lucide-react";

import { getClueType } from "@/lib/clueTypeSystem";
import type { HuntCard } from "@/lib/types/hunt-ui";
import { cn } from "@/lib/utils";

const CLUE_TYPE_LABELS = {
  text: "Text",
  image: "Image",
  location: "GPS",
  qr: "QR",
  "multiple-choice": "Multiple choice",
} as const;

interface HuntCardHeaderProps {
  hunt: HuntCard;
  solved: boolean;
  points?: number;
  currentIndex: number;
  totalHunts: number;
  count: number;
  countIsLoading: boolean;
  countError: string | null;
  trending: boolean;
  a11y: (key: string) => string;
}

export function HuntCardHeader({
  hunt,
  solved,
  points,
  currentIndex,
  totalHunts,
  count,
  countIsLoading,
  countError,
  trending,
  a11y,
}: HuntCardHeaderProps) {
  const clueType = getClueType({ type: hunt.type });

  return (
    <div
      className={cn(
        "rounded-t-xl sm:rounded-t-2xl px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6 text-white bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] print:bg-none print:text-black print:p-8"
      )}
    >
      {solved && (
        <div className="absolute inset-0 bg-green-500/10 rounded-xl sm:rounded-2xl z-20 flex items-center justify-center pointer-events-none print:hidden">
          <CheckCircle2 className="w-12 sm:w-16 h-12 sm:h-16 text-green-500 opacity-60" />
        </div>
      )}
      <div className="flex justify-between items-center text-xs sm:text-sm mb-3 sm:mb-4 relative z-10">
        {points != null && (
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold print:bg-transparent print:border print:border-gray-300 print:text-black">
            {points} pts
          </span>
        )}
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold print:border print:border-gray-300 print:text-black">
          {CLUE_TYPE_LABELS[clueType]}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {trending && (
            <span
              className="trending-badge bg-orange-500/80 text-white px-2 py-0.5 rounded-full text-xs font-semibold print:hidden"
              aria-label={a11y("trendingHunt")}
            >
              🔥 Trending
            </span>
          )}
          <span className="text-[#B3B3E5] print:text-black text-xs sm:text-sm">
            {currentIndex}/{totalHunts}
          </span>
        </div>
        {hunt.difficulty && (
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-semibold ml-2 print:border print:text-black",
              hunt.difficulty === "Easy" && "bg-green-500/30 text-green-200 print:border-green-500",
              hunt.difficulty === "Medium" &&
                "bg-yellow-500/30 text-yellow-200 print:border-yellow-500",
              hunt.difficulty === "Hard" && "bg-red-500/30 text-red-200 print:border-red-500"
            )}
          >
            {hunt.difficulty}
          </span>
        )}
        <span className="text-[#B3B3E5] ml-auto print:text-black text-xs sm:text-sm">
          {currentIndex}/{totalHunts}
        </span>
      </div>
      <span
        className="player-count block text-xs text-white/60 mb-2 print:hidden"
        aria-label={
          countIsLoading
            ? "Loading player count"
            : countError
              ? undefined
              : `${count} player${count !== 1 ? "s" : ""} registered`
        }
      >
        {countIsLoading ? (
          <span className="player-count--loading" aria-hidden="true">
            —
          </span>
        ) : countError ? null : (
          `${count} player${count !== 1 ? "s" : ""} registered`
        )}
      </span>
      <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 line-clamp-2 print:text-3xl print:mb-4">
        {hunt.title || "Untitled Hunt"}
      </h3>
      <p
        className="text-xs sm:text-sm opacity-90 mb-4 sm:mb-6 line-clamp-3 print:text-lg print:opacity-100 print:mb-8"
        dangerouslySetInnerHTML={{ __html: hunt.description || "No description provided." }}
      />
    </div>
  );
}
