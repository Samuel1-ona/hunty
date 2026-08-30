/**
 * Player domain types shared across web and mobile.
 */

/** A player's live progress within a single hunt. */
export interface PlayerProgress {
  hunt_id: number;
  player: string;
  current_clue_index: number;
  completed: boolean;
  reward_claimed: boolean;
}

/** Aggregated lifetime stats for a player address. */
export interface PlayerStats {
  address: string;
  totalHuntsCompleted: number;
  totalPointsEarned: number;
  totalNftsReceived: number;
  totalCompletionTimeSeconds: number;
  completedHuntsTracked: number;
  averageCompletionTimeSeconds: number;
  lastUpdated: number;
}

export type HuntProgressStatus = 'Completed' | 'In-Progress';

/** A player's progress summary for a hunt shown on the profile dashboard. */
export interface PlayerHuntProgress {
  id: number;
  title: string;
  description: string;
  totalClues: number;
  status: HuntProgressStatus;
  pointsEarned: number;
  startedAt: string;
  completedAt?: string;
}
