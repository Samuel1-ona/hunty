/**
 * Aggregation logic for the public hunter profile (#/profile).
 *
 * The profile dashboard needs statistics that are derived from the *same*
 * on-chain leaderboard data that powers the public leaderboard surfaces, so
 * that a player's rank on their profile always matches their rank on the hunt
 * leaderboard. This module is the single source of truth for that derivation.
 *
 * Everything here is free of React and `window` access, so it is unit-testable
 * and can run in a server component for the public (wallet-less) profile view.
 * The aggregation helpers themselves are pure; the only stateful part is the
 * bounded summary cache in front of `getPlayerProfileSummary` (see below).
 */

import { PLAYER_PROFILE_STATS } from "@/lib/config/constants";
import {
  computeLeaderboardStats,
  findPlayerRank,
  getRankedLeaderboard,
  type RankedLeaderboardEntry,
} from "@/lib/leaderboard";
import { logger } from "@/lib/logger";
import type { LeaderboardEntry, StoredHunt } from "@/lib/types";

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
  huntsById: Map<number, Pick<StoredHunt, "title" | "category" | "rewardType">>
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
  huntsById?: Map<number, Pick<StoredHunt, "rewardType">>
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
    return rewardType === "NFT" || rewardType === "Both";
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
 * Bounded, TTL'd cache of derived profile summaries.
 *
 * Deriving a summary costs one on-chain leaderboard read per hunt, so a busy
 * profile page would otherwise re-read every leaderboard on every render. Two
 * bounds keep the cache from becoming a leak:
 *
 *  - **TTL** (`PLAYER_PROFILE_STATS.CACHE_TTL_MS`) caps how long one instance
 *    may serve stats that a peer instance has already refreshed.
 *  - **LRU cap** (`PLAYER_PROFILE_STATS.CACHE_MAX_ENTRIES`) caps total memory.
 *    The key space is attacker-controlled (any wallet address), so a size bound
 *    is what actually guarantees the footprint.
 *
 * `Map` preserves insertion order, so the first key is always the least
 * recently used one. Entries are treated as immutable: the cached summary is
 * shared by reference with every caller, so consumers must not mutate it.
 */
const summaryCache = new Map<string, { summary: PlayerProfileSummary; expiresAt: number }>();

/** Drops every cached summary. Exposed for tests and for explicit invalidation. */
export function clearProfileSummaryCache(): void {
  summaryCache.clear();
}

/**
 * Cache key for a summary. Includes the hunt set, because a summary derived
 * from a different set of hunts is a different value.
 */
function summaryCacheKey(address: string, huntIds: number[]): string {
  const ids = [...huntIds].sort((a, b) => a - b).join(",");
  return `${address.trim().toLowerCase()}|${ids}`;
}

function readSummaryCache(key: string): PlayerProfileSummary | null {
  const entry = summaryCache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    summaryCache.delete(key);
    return null;
  }

  // Re-insert so insertion order tracks recency, making eviction true LRU.
  summaryCache.delete(key);
  summaryCache.set(key, entry);
  return entry.summary;
}

function writeSummaryCache(key: string, summary: PlayerProfileSummary): void {
  // Delete first so a refresh moves the key to the most-recently-used end.
  summaryCache.delete(key);
  summaryCache.set(key, {
    summary,
    expiresAt: Date.now() + PLAYER_PROFILE_STATS.CACHE_TTL_MS,
  });

  while (summaryCache.size > PLAYER_PROFILE_STATS.CACHE_MAX_ENTRIES) {
    const oldest = summaryCache.keys().next();
    if (oldest.done) break;
    summaryCache.delete(oldest.value);
  }
}

/**
 * Fetches every supplied hunt's leaderboard and derives the player's profile.
 *
 * Results are memoised per (address, hunt set) for
 * `PLAYER_PROFILE_STATS.CACHE_TTL_MS`, bounded to
 * `PLAYER_PROFILE_STATS.CACHE_MAX_ENTRIES` least-recently-used entries.
 *
 * Leaderboard reads are issued in parallel and individual failures are logged
 * and skipped, so one unreachable hunt cannot blank out the whole profile.
 */
export async function getPlayerProfileSummary(
  address: string,
  hunts: StoredHunt[]
): Promise<PlayerProfileSummary> {
  const trimmed = address?.trim() ?? "";
  if (!trimmed || !hunts.length) {
    return { address: trimmed, stats: emptyProfileStats(), timeline: [] };
  }

  const cacheKey = summaryCacheKey(trimmed, hunts.map((hunt) => hunt.id));
  const cached = readSummaryCache(cacheKey);
  if (cached) return cached;

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

  const summary: PlayerProfileSummary = {
    address: trimmed,
    stats: summariseCompletions(timeline, huntsById),
    timeline,
  };

  writeSummaryCache(cacheKey, summary);

  return summary;
}
 