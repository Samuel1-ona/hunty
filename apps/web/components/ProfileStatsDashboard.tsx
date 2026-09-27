"use client";

import { Award, Layers, Medal, Sparkles, Star, Target, Trophy } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import type { PlayerProfileStats } from "@/lib/playerProfileStats";

interface ProfileStatsDashboardProps {
  stats: PlayerProfileStats;
  /** Renders shimmer placeholders while leaderboard data is loading. */
  isLoading?: boolean;
}

function formatRank(rank: number | null): string {
  if (rank === null) return "—";
  return `#${rank}`;
}

/**
 * Aggregated statistics panel for a hunter profile.
 *
 * Values are derived from on-chain leaderboard data (see
 * `lib/playerProfileStats.ts`) so they always agree with the public
 * leaderboards.
 */
export function ProfileStatsDashboard({ stats, isLoading = false }: ProfileStatsDashboardProps) {
  const cards: Array<{
    key: string;
    label: string;
    value: ReactNode;
    hint?: string;
    icon: ReactNode;
    accent: string;
  }> = [
    {
      key: "hunts",
      label: "Hunts Completed",
      value: stats.totalHuntsCompleted,
      hint: "Hunts you appear on a leaderboard for",
      icon: <Target className="h-4 w-4" />,
      accent: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
    {
      key: "points",
      label: "Points Earned",
      value: stats.totalPoints,
      hint: "Total across every hunt",
      icon: <Sparkles className="h-4 w-4" />,
      accent: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      key: "rank",
      label: "Best Rank",
      value: formatRank(stats.bestRank),
      hint:
        stats.averageRank !== null ? `Average rank ${stats.averageRank}` : "No ranked finishes yet",
      icon: <Trophy className="h-4 w-4" />,
      accent: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      key: "nfts",
      label: "NFTs Won",
      value: stats.nftsWon,
      hint: "From NFT-rewarding hunts",
      icon: <Award className="h-4 w-4" />,
      accent: "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-100",
    },
    {
      key: "category",
      label: "Favourite Category",
      value: stats.favouriteCategory ?? "—",
      hint: "Most played hunt category",
      icon: <Layers className="h-4 w-4" />,
      accent: "text-sky-600 bg-sky-50 border-sky-100",
    },
    {
      key: "podium",
      label: "Podium Finishes",
      value: stats.podiumFinishes,
      hint: `${stats.firstPlaceFinishes} first-place ${
        stats.firstPlaceFinishes === 1 ? "finish" : "finishes"
      }`,
      icon: <Medal className="h-4 w-4" />,
      accent: "text-rose-600 bg-rose-50 border-rose-100",
    },
  ];

  if (isLoading) {
    return (
      <div
        data-testid="profile-stats-loading"
        aria-busy="true"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {cards.map((card) => (
          <Card key={card.key} className="border border-slate-200 bg-white/70 shadow-sm">
            <CardContent className="flex flex-col gap-3 px-5 py-4">
              <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="h-7 w-16 animate-pulse rounded-lg bg-slate-200" />
              <div className="h-3 w-32 animate-pulse rounded-full bg-slate-100" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <dl
      data-testid="profile-stats"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {cards.map((card) => (
        <Card
          key={card.key}
          className="border border-slate-200 bg-white/80 shadow-sm transition-shadow hover:shadow-md"
        >
          <CardContent className="flex items-start justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {card.label}
              </dt>
              <dd
                className="mt-1 truncate text-2xl font-semibold text-slate-900"
                title={typeof card.value === "string" ? card.value : undefined}
              >
                {card.value}
              </dd>
              {card.hint && <p className="mt-1 text-xs text-slate-500">{card.hint}</p>}
            </div>
            <span
              aria-hidden="true"
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${card.accent}`}
            >
              {card.icon}
            </span>
          </CardContent>
        </Card>
      ))}
    </dl>
  );
}

/** Small inline badge summarising a player's headline achievement. */
export function ProfileHighlightBadge({ stats }: { stats: PlayerProfileStats }) {
  if (stats.firstPlaceFinishes > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
        <Star className="h-3.5 w-3.5" aria-hidden="true" />
        {stats.firstPlaceFinishes}× Champion
      </span>
    );
  }

  if (stats.totalHuntsCompleted > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
        <Target className="h-3.5 w-3.5" aria-hidden="true" />
        {stats.totalHuntsCompleted} completed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
      New hunter
    </span>
  );
}
 