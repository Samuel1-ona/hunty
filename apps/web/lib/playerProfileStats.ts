/**
 * Aggregation logic for the public hunter profile (#/profile).
 *
 * The profile dashboard needs statistics that are derived from the *same*
 * on-chain leaderboard data that powers the public leaderboard surfaces, so
 * that a player's rank on their profile always matches their rank on the hunt
 * leaderboard. This module is the single source of truth for that derivation.
 *
 * Everything here is pure / server-safe: callers pass in the raw ranked
 * leaderboards and hunt metadata, and these helpers turn them into the
 * aggregate stats and completion timeline the profile page renders. Keeping it
 * free of React and `window` access means it is unit-testable and can run in a
 * server component for the public (wallet-less) profile view.
 */

import {
  computeLeaderboardStats,
  findPlayerRank,
  getRankedLeaderboard,
  type RankedLeaderboardEntry,
} from '@/lib/leaderboard';
import { logger } from '@/lib/logger';
import type { LeaderboardEntry, StoredHunt } from '@/lib/types';

/** A single hunt the player appears on the leaderboard for. */
export interface PlayerHuntCompletion {
  huntId: number;
  huntTitle: string;
  /** Category of the hunt, used to derive the player's favourite category. */
  category?: string;
  /** Points the player scored on this hunt. */
  points: number;
  /** 1-based rank on that hunt's leaderboard (competition ranking). */
  rank: number;
  /** How many players are on that hunt's leaderboard. */
  totalPlayers: number;
  /** Unix seconds when the player completed the hunt, when reported. */
  completedAt?: number;
  /** Deep link to this hunt's public leaderboard. */
  leaderboardHref: string;
}

/** Aggregate statistics rendered by the profile stats dashboard. */
export interface PlayerProfileStats {
  /** Number of hunts the player appears on a leaderboard for. */
  totalHuntsCompleted: number;
  /** Sum of points across every hunt leaderboard. */
  totalPoints: number;
  /**
   * Best (numerically lowest) rank achieved across all hunts, or `null` when
   * the player has no completions.
   */
  bestRank: number | null;
  /** Average rank across all hunts, rounded to one decimal, or `null`. */
  averageRank: number | null;
  /** Number of first-place finishes. */
  firstPlaceFinishes: number;
  /** Number of top-3 finishes. */
  podiumFinishes: number;
  /** NFTs won, derived from hunts whose reward type includes an NFT. */
  nftsWon: number;
  /** Most frequently played category, or `null` when unknown. */
  favouriteCategory: string | null;
}

/** Everything the profile page needs for one player. */
export interface PlayerProfileSummary {
  address: string;
  stats: PlayerProfileStats;
  /** Completions sorted newest-first, ready to render as a timeline. */
  timeline: PlayerHuntCompletion[];
}

/** Empty stats object used for unknown / wallet-less players. */
export function emptyProfileStats(): PlayerProfileStats {
  return {
    totalHuntsCompleted: 0,
    totalPoints: 0,
    bestRank: null,
    averageRank: null,
    firstPlaceFinishes: 0,
    podiumFinishes: 0,
    nftsWon: 0,
    favouriteCategory: null,
  };
}

/** Builds the public leaderboard link for a hunt. */
export function huntLeaderboardHref(huntId: number): string {
  return `/hunt/${huntId}/leaderboard`;
}

/**
 * Picks the most common non-empty category. Ties are broken by the category
 * that reached the winning count first, which keeps the result stable.
 */
export function pickFavouriteCategory(categories: Array<string | undefined | null>): string | null {
  const counts = new Map<string, number>();

  for (const raw of categories) {
    const category = raw?.trim();
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [category, count] of counts) {
    if (count > bestCount) {
      best = category;
      bestCount = count;
    }
  }

  return best;
}

/**
 * Turns a set of per-hunt ranked leaderboards into the player's completion
 * timeline. Hunts the player does not appear on are skipped.
 *
 * @param address       Stellar address to look for (case-insensitive).
 * @param boards        Ranked leaderboard per hunt, keyed by hunt id.
 * @param huntsById     Hunt metadata used for titles / categories / rewards.
 */
export function buildCompletionTimeline(
  address: string,
  boards: Array<{ huntId: number; entries: RankedLeaderboardEntry[] }>,
  huntsById: Map<number, Pick<StoredHunt, 'title' | 'category' | 'rewardType'>>
): PlayerHuntCompletion[] {
  const timeline: PlayerHuntCompletion[] = [];

  for (const { huntId, entries } of boards) {
    const mine = findPlayerRank(entries, address);
    if (!mine) continue;

    const hunt = huntsById.get(huntId);
    const { totalPlayers } = computeLeaderboardStats(entries as LeaderboardEntry[]);

    timeline.push({
      huntId,
      huntTitle: hunt?.title ?? `Hunt #${huntId}`,
      category: hunt?.category ?? mine.category,
      points: mine.points,
      rank: mine.rank,
      totalPlayers,
      completedAt: mine.completedAt,
      leaderboardHref: huntLeaderboardHref(huntId),
    });
  }

  // Newest first; completions without a timestamp sink to the bottom.
  return timeline.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

/** Reduces a completion timeline into the aggregate profile statistics. */
export function summariseCompletions(
  timeline: PlayerHuntCompletion[],
  huntsById?: Map<number, Pick<StoredHunt, 'rewardType'>>
): PlayerProfileStats {
  if (!timeline.length) return emptyProfileStats();

  const totalPoints = timeline.reduce((sum, entry) => sum + entry.points, 0);
  const bestRank = timeline.reduce(
    (min, entry) => (entry.rank < min ? entry.rank : min),
    Number.POSITIVE_INFINITY
  );
  const rankSum = timeline.reduce((sum, entry) => sum + entry.rank, 0);
  const firstPlaceFinishes = timeline.filter((e) => e.rank === 1).length;
  const podiumFinishes = timeline.filter((e) => e.rank <= 3).length;

  const nftsWon = timeline.filter((entry) => {
    const rewardType = huntsById?.get(entry.huntId)?.rewardType;
    return rewardType === 'NFT' || rewardType === 'Both';
  }).length;

  return {
    totalHuntsCompleted: timeline.length,
    totalPoints,
    bestRank: Number.isFinite(bestRank) ? bestRank : null,
    averageRank: Math.round((rankSum / timeline.length) * 10) / 10,
    firstPlaceFinishes,
    podiumFinishes,
    nftsWon,
    favouriteCategory: pickFavouriteCategory(timeline.map((e) => e.category)),
  };
}

/**
 * Fetches every supplied hunt's leaderboard and derives the player's profile.
 *
 * Leaderboard reads are issued in parallel and individual failures are logged
 * and skipped, so one unreachable hunt cannot blank out the whole profile.
 */
export async function getPlayerProfileSummary(
  address: string,
  hunts: StoredHunt[]
): Promise<PlayerProfileSummary> {
  const trimmed = address?.trim() ?? '';
  if (!trimmed || !hunts.length) {
    return { address: trimmed, stats: emptyProfileStats(), timeline: [] };
  }

  const huntsById = new Map(hunts.map((hunt) => [hunt.id, hunt]));

  const boards = await Promise.all(
    hunts.map(async (hunt) => {
      try {
        return { huntId: hunt.id, entries: await getRankedLeaderboard(hunt.id) };
      } catch (error) {
        logger.error(`Failed to load leaderboard for hunt ${hunt.id}:`, error);
        return { huntId: hunt.id, entries: [] as RankedLeaderboardEntry[] };
      }
    })
  );

  const timeline = buildCompletionTimeline(trimmed, boards, huntsById);

  return {
    address: trimmed,
    stats: summariseCompletions(timeline, huntsById),
    timeline,
  };
}
