/**
 * Computed difficulty types derived from real player completion data.
 *
 * These are separate from the creator-assigned `HuntDifficulty` tag so the two
 * signals can be presented independently. The computed label is derived from
 * two statistics gathered across all players who have attempted the hunt:
 *
 *  - **completionRate** — fraction of players who started and finished (0–1)
 *  - **avgSolveTimeMs** — average wall-clock time from first clue to completion
 *    among players who finished, in milliseconds
 *
 * The label bands are intentionally broad so that a hunt with very few
 * completions still produces a meaningful signal while avoiding false precision.
 */

/** Four-tier difficulty label derived from completion data. */
export type ComputedDifficultyLabel = "Easy" | "Medium" | "Hard" | "Expert";

/**
 * The full computed-difficulty payload returned by
 * `GET /api/v1/hunts/:id/difficulty`.
 */
export interface ComputedDifficulty {
  /** The hunt this payload belongs to. */
  huntId: number;
  /** Difficulty tier derived from completion statistics. */
  label: ComputedDifficultyLabel;
  /**
   * Fraction of players who started the hunt and later completed it (0–1).
   * `null` when fewer than {@link minSamples} players have started.
   */
  completionRate: number | null;
  /**
   * Arithmetic mean of solve times (ms) for players who completed the hunt.
   * `null` when no completions exist.
   */
  avgSolveTimeMs: number | null;
  /** Total number of players who started the hunt. */
  totalAttempts: number;
  /** Number of players who completed the hunt. */
  totalCompletions: number;
  /**
   * `true` when the label is based on enough samples to be considered reliable
   * (at least {@link minSamples} attempts). `false` means the label is
   * provisional and may swing as more players play.
   */
  reliable: boolean;
}
