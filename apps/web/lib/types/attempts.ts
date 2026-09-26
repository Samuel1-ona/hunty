import type { PlayerProgress } from "@hunty/types";

import type { ClueScoringBreakdown, HuntScoringBreakdown, ScoringWeights } from "../scoring";

export type RegistrationStatus = {
  isRegistered: boolean;
  progressData?: PlayerProgress;
  loading: boolean;
  error?: string;
};

export type RegistrationResult = {
  success: boolean;
  error?: string;
  transactionHash?: string;
};

export type HuntAttemptStatus = "completed" | "abandoned" | "in_progress";

export interface ClueAttemptRecord {
  clueId: number;
  clueIndex: number;
  question: string;
  answerGiven: string;
  timeTakenSeconds: number;
  pointsEarned: number;
  answeredAt: string;
  hintsUsed: number; // Number of hints used for this clue
  scoringBreakdown?: ClueScoringBreakdown; // Detailed scoring breakdown
}

export interface HuntAttemptRecord {
  id: string;
  huntId: number;
  huntTitle: string;
  playerAddress: string;
  status: HuntAttemptStatus;
  startedAt: string;
  completedAt?: string;
  totalTimeSeconds: number;
  totalPoints: number;
  clues: ClueAttemptRecord[];
  attemptNumber: number;
  currentStreak: number; // Current consecutive clues solved streak
  scoringWeights?: ScoringWeights; // Scoring weights used for this attempt
  scoringBreakdown?: HuntScoringBreakdown; // Detailed scoring breakdown for the entire attempt
  isFirstToComplete?: boolean; // Whether this was the first completion of the hunt
}

export interface HuntAttemptTimeComparison {
  playerTimeSeconds: number;
  playerTimeLabel: string;
  fastestTimeSeconds: number | null;
  fastestTimeLabel: string | null;
  averageTimeSeconds: number | null;
  averageTimeLabel: string | null;
  rankAmongFastest: number | null;
  totalComparedPlayers: number;
}
