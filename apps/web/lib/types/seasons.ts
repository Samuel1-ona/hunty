import type { Reward } from "./rewards";

export type SeasonStatus = "Upcoming" | "Active" | "Ended";

export interface Season {
  id: number;
  name: string;
  /** Unix timestamp in seconds — when the season starts. */
  startTime: number;
  /** Unix timestamp in seconds — when the season ends. */
  endTime: number;
  status: SeasonStatus;
  /** Reward amounts for the top N players, indexed by place (1st, 2nd, ...). */
  rewards?: Reward[];
}

export interface SeasonLeaderboardEntry {
  address: string;
  name?: string;
  points: number;
  /** Final rank for this player at season end (set once archived). */
  rank?: number;
}

export interface ArchivedSeason {
  season: Season;
  finalLeaderboard: SeasonLeaderboardEntry[];
  archivedAt: number;
}

export interface SeasonBadge {
  seasonId: number;
  seasonName: string;
  /** Final rank the player achieved, if the season has ended. */
  rank?: number;
  earnedAt: number;
}

// ─── Hunt Feed ───────────────────────────────────────────────────────────────

export type HuntFeedCategory = "trending" | "new" | "nearby" | "featured" | "following";
