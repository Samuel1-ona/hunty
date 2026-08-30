/**
 * Shared, server-safe leaderboard ranking logic.
 *
 * The contract data layer (lib/contracts/hunt.ts) exposes raw
 * LeaderboardEntry[] with NO stored rank - rank is derived by sorting on
 * points descending. This module is the single source of truth for that
 * derivation so the public API route, the OG image route, the public
 * leaderboard page, and the embed widget all agree on positions and stats.
 *
 * Everything here runs on the server (no window/localStorage access).
 */

import { get_hunt_leaderboard } from '@/lib/contracts/hunt';
import { SEED_HUNTS } from '@/lib/huntStore';
import type { LeaderboardEntry } from '@/lib/types';

/** A leaderboard entry augmented with its derived 1-based rank. */
export interface RankedLeaderboardEntry extends LeaderboardEntry {
  /** 1-based position using standard competition ranking (ties share a rank). */
  rank: number;
}

/** Aggregate stats describing a hunt's leaderboard. */
export interface LeaderboardStats {
  totalPlayers: number;
  topScore: number;
  totalPoints: number;
}

/** Resolved hunt summary used by share surfaces (title falls back gracefully). */
export interface HuntSummary {
  id: number;
  title: string;
}

/**
 * Applies standard competition ranking ("1224") to a points-sorted list.
 * Assumes `entries` is already sorted by points descending.
 */
function assignRanks(entries: LeaderboardEntry[]): RankedLeaderboardEntry[] {
  let lastPoints: number | null = null;
  let lastRank = 0;

  return entries.map((entry, index) => {
    if (lastPoints === null || entry.points !== lastPoints) {
      lastRank = index + 1;
      lastPoints = entry.points;
    }
    return { ...entry, rank: lastRank };
  });
}

/**
 * Fetches a hunt's leaderboard sorted by points descending, with a derived rank.
 */
export async function getRankedLeaderboard(huntId: number): Promise<RankedLeaderboardEntry[]> {
  const raw = await get_hunt_leaderboard(huntId);
  const sorted = [...raw].sort((a, b) => b.points - a.points);
  return assignRanks(sorted);
}

/** Computes aggregate stats from a ranked (or raw) leaderboard. */
export function computeLeaderboardStats(entries: LeaderboardEntry[]): LeaderboardStats {
  const totalPlayers = entries.length;
  const totalPoints = entries.reduce((sum, e) => sum + e.points, 0);
  const topScore = entries.reduce((max, e) => (e.points > max ? e.points : max), 0);
  return { totalPlayers, topScore, totalPoints };
}

/**
 * Case-insensitive lookup of a single player's ranked entry by address.
 * Returns null when the address is empty or not present on the board.
 */
export function findPlayerRank(
  entries: RankedLeaderboardEntry[],
  address: string | null | undefined
): RankedLeaderboardEntry | null {
  if (!address) return null;
  const needle = address.trim().toLowerCase();
  if (!needle) return null;
  return entries.find((e) => e.address.trim().toLowerCase() === needle) ?? null;
}

/**
 * Resolves a hunt's display title in a server-safe way. Uses the seeded hunt
 * list and falls back to "Hunt #<id>" when the id is not seeded.
 */
export function getHuntSummary(huntId: number): HuntSummary {
  const seeded = SEED_HUNTS.find((h) => h.id === huntId);
  return {
    id: huntId,
    title: seeded?.title ?? `Hunt #${huntId}`,
  };
}
