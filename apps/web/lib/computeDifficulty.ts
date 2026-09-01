/**
 * computeDifficulty — derives a difficulty label for a hunt from real
 * player completion statistics stored in `progressData`.
 *
 * ## Algorithm
 *
 * The label is computed from two independent signals and the harsher of
 * the two is used so that a hunt that is hard-to-finish *or* slow-to-solve
 * never gets an artificially low label.
 *
 * **Completion-rate tier** (fraction of starters who finished):
 *  ≥ 0.70  → Easy
 *  ≥ 0.40  → Medium
 *  ≥ 0.15  → Hard
 *  < 0.15  → Expert
 *
 * **Solve-time tier** (average ms for completions):
 *  < 10 min  → Easy
 *  < 30 min  → Medium
 *  < 90 min  → Hard
 *  ≥ 90 min  → Expert
 *
 * Both tiers are mapped to a numeric rank (0=Easy … 3=Expert) and the
 * maximum rank is used as the final label.
 *
 * A result is considered **reliable** once at least `MIN_SAMPLES` players
 * have started the hunt.
 */

import type { ComputedDifficulty, ComputedDifficultyLabel } from "@hunty/types";
import { getAllProgressForHunt } from "@/lib/progressData";

/** Minimum number of attempts before the label is flagged as reliable. */
export const MIN_SAMPLES = 5;

// ─── Tier thresholds ────────────────────────────────────────────────────────

const COMPLETION_RATE_TIERS: Array<{ min: number; label: ComputedDifficultyLabel }> = [
  { min: 0.7, label: "Easy" },
  { min: 0.4, label: "Medium" },
  { min: 0.15, label: "Hard" },
  { min: 0, label: "Expert" },
];

const MS_PER_MIN = 60_000;
const SOLVE_TIME_TIERS: Array<{ maxMs: number; label: ComputedDifficultyLabel }> = [
  { maxMs: 10 * MS_PER_MIN, label: "Easy" },
  { maxMs: 30 * MS_PER_MIN, label: "Medium" },
  { maxMs: 90 * MS_PER_MIN, label: "Hard" },
  { maxMs: Infinity, label: "Expert" },
];

const LABEL_RANK: Record<ComputedDifficultyLabel, number> = {
  Easy: 0,
  Medium: 1,
  Hard: 2,
  Expert: 3,
};

const RANK_LABEL: ComputedDifficultyLabel[] = ["Easy", "Medium", "Hard", "Expert"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function completionRateLabel(rate: number): ComputedDifficultyLabel {
  for (const tier of COMPLETION_RATE_TIERS) {
    if (rate >= tier.min) return tier.label;
  }
  return "Expert";
}

function solveTimeLabel(avgMs: number): ComputedDifficultyLabel {
  for (const tier of SOLVE_TIME_TIERS) {
    if (avgMs < tier.maxMs) return tier.label;
  }
  return "Expert";
}

function harderOf(
  a: ComputedDifficultyLabel,
  b: ComputedDifficultyLabel,
): ComputedDifficultyLabel {
  return RANK_LABEL[Math.max(LABEL_RANK[a], LABEL_RANK[b])];
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute a {@link ComputedDifficulty} payload for a hunt from file-based
 * progress data.
 *
 * This is intentionally a synchronous computation over the already-read
 * progress store so it can be called directly inside an API handler without
 * an additional async layer.
 *
 * @param huntId - The numeric hunt ID.
 * @returns A fully-populated {@link ComputedDifficulty} object. When there
 *   are no attempts yet the label defaults to `"Medium"` (provisional) with
 *   `reliable: false`.
 */
export function computeDifficulty(huntId: number): ComputedDifficulty {
  const entries = getAllProgressForHunt(huntId);

  const totalAttempts = entries.length;
  const completions = entries.filter(
    (e) => e.completed && e.completedAt !== null && e.startedAt > 0,
  );
  const totalCompletions = completions.length;

  // No data at all — return a provisional Medium so the badge still renders.
  if (totalAttempts === 0) {
    return {
      huntId,
      label: "Medium",
      completionRate: null,
      avgSolveTimeMs: null,
      totalAttempts: 0,
      totalCompletions: 0,
      reliable: false,
    };
  }

  const completionRate = totalCompletions / totalAttempts;

  let avgSolveTimeMs: number | null = null;
  if (totalCompletions > 0) {
    const totalMs = completions.reduce((sum, e) => {
      // completedAt is guaranteed non-null by the filter above
      return sum + ((e.completedAt as number) - e.startedAt);
    }, 0);
    avgSolveTimeMs = totalMs / totalCompletions;
  }

  // Derive label from each available signal, then take the harder tier.
  let label = completionRateLabel(completionRate);
  if (avgSolveTimeMs !== null) {
    label = harderOf(label, solveTimeLabel(avgSolveTimeMs));
  }

  return {
    huntId,
    label,
    completionRate,
    avgSolveTimeMs,
    totalAttempts,
    totalCompletions,
    reliable: totalAttempts >= MIN_SAMPLES,
  };
}
