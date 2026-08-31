import type { ClueDifficulty, HuntDifficulty } from "./types";

// Scoring configuration types
export interface ScoringWeights {
  timeBonus: number; // Weight for time-based bonus (0-1)
  hintPenalty: number; // Penalty multiplier for using hints (0-1)
  difficultyMultiplier: {
    Easy: number;
    Medium: number;
    Hard: number;
    /** Hunt-level difficulty tier; clue-level scoring falls back to Hard. */
    Expert: number;
  };
  streakBonus: number; // Bonus points per consecutive clue solved
  firstToCompleteBonus: number; // Bonus points for being first to complete the hunt
}

// Default scoring weights
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  timeBonus: 0.5,
  hintPenalty: 0.2,
  difficultyMultiplier: {
    Easy: 1,
    Medium: 1.5,
    Hard: 2,
    Expert: 2.5,
  },
  streakBonus: 5,
  firstToCompleteBonus: 100,
};

// Detailed scoring breakdown for a single clue
export interface ClueScoringBreakdown {
  basePoints: number;
  difficultyMultiplier: number;
  timeBonus: number;
  hintPenalty: number;
  streakBonus: number;
  totalPoints: number;
}

// Detailed scoring breakdown for an entire hunt attempt
export interface HuntScoringBreakdown {
  clues: { [clueId: number]: ClueScoringBreakdown };
  totalBasePoints: number;
  totalTimeBonus: number;
  totalHintPenalty: number;
  totalStreakBonus: number;
  firstToCompleteBonus: number;
  totalPoints: number;
}

/**
 * Calculate the time bonus for a clue
 * @param basePoints Base points for the clue
 * @param timeTakenSeconds Time taken to solve the clue
 * @param maxTimeSeconds Maximum time to get full bonus (default: 60 seconds)
 * @param weight Time bonus weight from config
 */
export function calculateTimeBonus(
  basePoints: number,
  timeTakenSeconds: number,
  maxTimeSeconds: number = 60,
  weight: number = DEFAULT_SCORING_WEIGHTS.timeBonus
): number {
  const cappedTime = Math.min(timeTakenSeconds, maxTimeSeconds);
  const normalizedTime = 1 - cappedTime / maxTimeSeconds;
  return Math.round(basePoints * normalizedTime * weight);
}

/**
 * Calculate the hint penalty for a clue using the legacy weight-based approach.
 * Used when per-hint `penalty` values are not available (backwards compatibility).
 * @param basePoints Base points for the clue
 * @param hintsUsed Number of hints used
 * @param weight Hint penalty weight from config
 */
export function calculateHintPenalty(
  basePoints: number,
  hintsUsed: number,
  weight: number = DEFAULT_SCORING_WEIGHTS.hintPenalty
): number {
  return Math.round(basePoints * weight * hintsUsed);
}

/**
 * Calculate the exact hint penalty from a progressive hints array.
 * Each hint carries its own absolute `penalty` in points, so we simply sum them.
 * This supersedes the weight-based `calculateHintPenalty` when hints data is present.
 *
 * @param revealedHintPenalties Array of `penalty` values for every hint the player revealed.
 */
export function calculateProgressiveHintPenalty(revealedHintPenalties: number[]): number {
  return revealedHintPenalties.reduce((sum, p) => sum + p, 0);
}

/**
 * Calculate the streak bonus
 * @param currentStreak Current consecutive clues solved streak
 * @param baseBonus Base bonus per streak
 */
export function calculateStreakBonus(
  currentStreak: number,
  baseBonus: number = DEFAULT_SCORING_WEIGHTS.streakBonus
): number {
  return currentStreak * baseBonus;
}

/**
 * Calculate the difficulty multiplier
 * @param difficulty Clue difficulty
 * @param multipliers Difficulty multipliers from config
 */
export function calculateDifficultyMultiplier(
  difficulty: ClueDifficulty | HuntDifficulty = "Medium",
  multipliers: ScoringWeights["difficultyMultiplier"] = DEFAULT_SCORING_WEIGHTS.difficultyMultiplier
): number {
  return multipliers[difficulty] || 1;
}

/**
 * Calculate the total points for a single clue.
 *
 * @param exactHintPenalty When provided (progressive hints mode), this value is
 *   used directly as the hint penalty instead of computing it from `hintsUsed`
 *   and the weight multiplier. Pass the sum of all revealed hint `penalty` fields.
 */
export function calculateCluePoints(
  basePoints: number,
  difficulty: ClueDifficulty | HuntDifficulty,
  timeTakenSeconds: number,
  hintsUsed: number,
  currentStreak: number,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
  exactHintPenalty?: number
): { breakdown: ClueScoringBreakdown; newStreak: number } {
  const difficultyMultiplier = calculateDifficultyMultiplier(
    difficulty,
    weights.difficultyMultiplier
  );
  const timeBonus = calculateTimeBonus(basePoints, timeTakenSeconds, 60, weights.timeBonus);
  // Prefer exact per-hint penalty sum when available; fall back to weight-based calc.
  const hintPenalty =
    exactHintPenalty !== undefined
      ? exactHintPenalty
      : calculateHintPenalty(basePoints, hintsUsed, weights.hintPenalty);
  const streakBonus = calculateStreakBonus(currentStreak, weights.streakBonus);

  const totalPoints = Math.max(
    0,
    Math.round(basePoints * difficultyMultiplier + timeBonus - hintPenalty + streakBonus)
  );

  return {
    breakdown: {
      basePoints,
      difficultyMultiplier,
      timeBonus,
      hintPenalty,
      streakBonus,
      totalPoints,
    },
    newStreak: currentStreak + 1,
  };
}
 