import type { ReactNode } from "react";

import type { ClueDifficulty } from "./clues";

export type LeaderboardTimePeriod = "today" | "week" | "month" | "all";
export type LeaderboardMetric = "points" | "completions";

export type LeaderboardEntry = {
  address: string;
  name?: string;
  points: number;
  completionCount?: number;
  completedAt?: number;
  category?: string;
  difficulty?: ClueDifficulty;
};

export interface LeaderboardFilters {
  timePeriod: LeaderboardTimePeriod;
  category: string;
  difficulty: ClueDifficulty | "all";
  metric: LeaderboardMetric;
}

export type FastestPlayerEntry = {
  address: string;
  name?: string;
  points?: number;
  completionTimeSeconds: number;
};

export interface LeaderboardDisplayEntry {
  position: number;
  name: string;
  points: number;
  icon: ReactNode;
  completionCount?: number;
  completedAt?: number;
  category?: string;
  difficulty?: ClueDifficulty;
  /** Full Stellar address for this row, when known. Drives the identicon, copy button, and explorer link. */
  address?: string;
  /** True when `name` is a player-chosen display name rather than a truncated address. */
  hasDisplayName?: boolean;
}

export interface FastestPlayerDisplayEntry {
  position: number;
  name: string;
  completionTimeLabel: string;
  points?: number;
  icon: ReactNode;
}
