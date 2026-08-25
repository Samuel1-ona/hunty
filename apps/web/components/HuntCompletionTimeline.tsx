"use client";

import { ArrowUpRight, Trophy } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PlayerHuntCompletion } from "@/lib/playerProfileStats";

interface HuntCompletionTimelineProps {
  completions: PlayerHuntCompletion[];
  isLoading?: boolean;
  /** Shown when the player has no completions. */
  emptyMessage?: string;
}

function formatCompletedAt(unixSeconds?: number): string {
  if (!unixSeconds) return "Date unavailable";
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function rankStyles(rank: number): { badge: string; dot: string } {
  if (rank === 1) {
    return {
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-400",
    };
  }
  if (rank <= 3) {
    return {
      badge: "bg-slate-100 text-slate-700 border-slate-300",
      dot: "bg-slate-400",
    };
  }
  return {
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-400",
  };
}

/**
 * Vertical timeline of the hunts a player has completed, newest first.
 *
 * Every entry links to that hunt's public leaderboard so a visitor can jump
 * straight to the player's leaderboard position.
 */
export function HuntCompletionTimeline({
  completions,
  isLoading = false,
  emptyMessage = "No completed hunts yet. Finish a hunt to start building your timeline.",
}: HuntCompletionTimelineProps) {
  if (isLoading) {
    return (
      <ul data-testid="timeline-loading" aria-busy="true" className="space-y-3">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <Card className="border border-slate-200 bg-white/70 shadow-sm">
              <CardContent className="flex flex-col gap-3 px-5 py-4">
                <div className="h-4 w-48 animate-pulse rounded-full bg-slate-200" />
                <div className="h-3 w-64 animate-pulse rounded-full bg-slate-100" />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    );
  }

  if (!completions.length) {
    return (
      <div
        data-testid="timeline-empty"
        className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center text-sm text-slate-600"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <ol data-testid="hunt-timeline" className="relative space-y-4 sm:pl-6">
      {/* Timeline rail (decorative, hidden on very small screens). */}
      <span
        aria-hidden="true"
        className="absolute left-[7px] top-2 bottom-2 hidden w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent sm:block"
      />

      {completions.map((completion) => {
        const { badge, dot } = rankStyles(completion.rank);

        return (
          <li key={`${completion.huntId}-${completion.completedAt ?? "na"}`} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-6 top-6 hidden h-3.5 w-3.5 rounded-full ring-4 ring-white sm:block ${dot}`}
            />

            <Card className="border border-slate-200 bg-white/80 shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900 md:text-base">
                      {completion.huntTitle}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge}`}
                    >
                      <Trophy className="h-3 w-3" aria-hidden="true" />
                      Rank {completion.rank}
                      {completion.totalPlayers > 0 && (
                        <span className="font-normal opacity-75"> / {completion.totalPlayers}</span>
                      )}
                    </span>
                    {completion.category && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        {completion.category}
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 text-xs text-slate-500">
                    <span className="font-semibold text-emerald-700">{completion.points} pts</span>
                    {" · "}
                    <time
                      dateTime={
                        completion.completedAt
                          ? new Date(completion.completedAt * 1000).toISOString()
                          : undefined
                      }
                    >
                      {formatCompletedAt(completion.completedAt)}
                    </time>
                  </p>
                </div>

                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="shrink-0 self-start rounded-full border-slate-300 text-xs hover:bg-slate-50 sm:self-center"
                >
                  <Link
                    href={completion.leaderboardHref}
                    aria-label={`View ${completion.huntTitle} leaderboard entry`}
                  >
                    Leaderboard
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
 