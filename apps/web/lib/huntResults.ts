/**
 * Pure aggregation logic for a hunt's permanent results page.
 *
 * Kept separate from `lib/progressData.ts` (which reads/writes the on-disk
 * progress store via `fs`) so the summary math can be unit tested — and
 * reused by API routes — without touching the filesystem.
 */

import type { Reward, StoredHunt } from "@/lib/types";
import type { StoredProgressEntry } from "@/lib/progressData";

export const HUNT_RESULTS_LEADERBOARD_LIMIT = 10;

export interface HuntResultEntry {
  position: number;
  wallet: string;
  points: number;
  completed: boolean;
  completedAt: number | null;
}

export interface HuntResultsSummary {
  /** Best-known player count: the larger of the stored snapshot and recorded progress entries. */
  totalPlayers: number;
  totalCompletions: number;
  topEntry: HuntResultEntry | null;
  /** Top finishers, sorted by points descending, capped at `HUNT_RESULTS_LEADERBOARD_LIMIT`. */
  leaderboard: HuntResultEntry[];
  rewardDistribution: Reward[];
}

/**
 * Per-player result summary for a single completed hunt, used to render the
 * shareable result-card OG image on completion.
 */
export interface HuntPlayerResult {
  /** 1-based rank position among ranked finishers, or null when absent. */
  rank: number | null;
  /** Completion time in seconds, derived from completedAt - startedAt, or null. */
  completionTimeSeconds: number | null;
}

/**
 * Derives a single player's rank and completion time from the hunt's progress
 * entries. Ranking mirrors `buildHuntResultsSummary` (points descending) so the
 * result card always agrees with the results page leaderboard.
 */
export function getPlayerHuntResult(
  entries: StoredProgressEntry[],
  wallet: string,
): HuntPlayerResult {
  const normalized = wallet.trim().toLowerCase();
  const progress = entries.find((entry) => entry.wallet.toLowerCase() === normalized);

  const ranked = [...entries]
    .filter((entry) => entry.totalPoints > 0 || entry.completed)
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const rankIndex = ranked.findIndex(
    (entry) => entry.wallet.toLowerCase() === normalized,
  );

  const completionTimeSeconds =
    progress && progress.completedAt && progress.startedAt
      ? Math.max(0, Math.round((progress.completedAt - progress.startedAt) / 1000))
      : null;

  return {
    rank: rankIndex === -1 ? null : rankIndex + 1,
    completionTimeSeconds,
  };
}

export function buildHuntResultsSummary(
  hunt: Pick<StoredHunt, "playerCount" | "rewardDistribution">,
  entries: StoredProgressEntry[]
): HuntResultsSummary {
  const ranked = [...entries]
    .filter((entry) => entry.totalPoints > 0 || entry.completed)
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const leaderboard: HuntResultEntry[] = ranked
    .slice(0, HUNT_RESULTS_LEADERBOARD_LIMIT)
    .map((entry, index) => ({
      position: index + 1,
      wallet: entry.wallet,
      points: entry.totalPoints,
      completed: entry.completed,
      completedAt: entry.completedAt,
    }));

  return {
    totalPlayers: Math.max(hunt.playerCount ?? 0, entries.length),
    totalCompletions: entries.filter((entry) => entry.completed).length,
    topEntry: leaderboard[0] ?? null,
    leaderboard,
    rewardDistribution: hunt.rewardDistribution ?? [],
  };
}
