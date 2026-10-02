/**
 * Clue-level analytics: solve rate, average attempts, and hint usage per clue.
 *
 * Data sources:
 *   anti_cheat_answers  — one row per submission; `correct` boolean tells us
 *                         which submissions led to a solve.
 *   hint_usage_events   — append-only log of hint reveals.
 *
 * Both tables are PostgreSQL, accessed via the shared `getDb()` client.
 *
 * Graceful degradation: every exported function catches DB errors and returns
 * a safe empty value rather than letting analytics failures surface to
 * end-users.
 */

import { getDb } from "@/lib/db"
import { logger } from "@/lib/logger"

// ─── Domain types ─────────────────────────────────────────────────────────────

/**
 * Per-clue analytics row returned by the API and consumed by the UI.
 *
 * solveRate    — percentage of unique wallets that eventually answered correctly
 *                (0–100, rounded to 1 decimal).
 * avgAttempts  — average number of submissions per wallet before a correct
 *                answer (or across all submissions if no correct answer yet).
 * hintsUsed    — total number of hint-reveal events for this clue.
 * abandoned    — true when the solveRate falls below the abandonment threshold
 *                supplied to getClueAnalytics().
 */
export interface ClueAnalyticsRow {
  clueId: number
  /** 1-based position of this clue within the hunt (order of first appearance). */
  position: number
  /** Short label, e.g. "Clue 3", used when no question text is available. */
  label: string
  totalAttempts: number
  uniquePlayers: number
  solvers: number
  /** 0–100, rounded to 1 decimal place. */
  solveRate: number
  avgAttempts: number
  hintsUsed: number
  /** True when solveRate < abandonmentThreshold. */
  abandoned: boolean
}

export interface ClueAnalyticsResult {
  huntId: number
  clues: ClueAnalyticsRow[]
  /** The threshold used to flag clues as abandoned (0–100). */
  abandonmentThreshold: number
}

// ─── Internal DB row shapes ───────────────────────────────────────────────────

interface AnswerAggRow {
  clue_id: number
  total_attempts: number
  unique_players: number
  solvers: number
}

interface HintAggRow {
  clue_id: number
  total_hints: number
}

interface AvgAttemptsRow {
  clue_id: number
  avg_attempts: number
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch per-clue analytics for a hunt.
 *
 * @param huntId             The hunt to query.
 * @param abandonmentThreshold  Solve-rate percentage below which a clue is
 *                              flagged as a likely abandonment point (default 40).
 */
export async function getClueAnalytics(
  huntId: number,
  abandonmentThreshold = 40,
): Promise<ClueAnalyticsResult> {
  try {
    const sql = getDb()

    // ── 1. Aggregate submission data per clue ──────────────────────────────
    // total_attempts  = all rows for this hunt+clue (regardless of correctness)
    // unique_players  = distinct wallets that attempted
    // solvers         = distinct wallets that eventually got it correct
    const answerRows = await sql<AnswerAggRow[]>`
      SELECT
        clue_id,
        COUNT(*)::int                                        AS total_attempts,
        COUNT(DISTINCT wallet)::int                         AS unique_players,
        COUNT(DISTINCT CASE WHEN correct THEN wallet END)::int AS solvers
      FROM anti_cheat_answers
      WHERE hunt_id = ${huntId}
      GROUP BY clue_id
      ORDER BY clue_id
    `

    // ── 2. Average attempts per wallet per clue ────────────────────────────
    // We first count attempts per (clue_id, wallet), then average those counts
    // over wallets so each player's attempt count is equally weighted.
    const avgRows = await sql<AvgAttemptsRow[]>`
      SELECT
        clue_id,
        ROUND(AVG(attempts)::numeric, 2)::float AS avg_attempts
      FROM (
        SELECT clue_id, wallet, COUNT(*)::int AS attempts
        FROM   anti_cheat_answers
        WHERE  hunt_id = ${huntId}
        GROUP  BY clue_id, wallet
      ) per_wallet
      GROUP BY clue_id
    `

    // ── 3. Hint usage per clue ─────────────────────────────────────────────
    const hintRows = await sql<HintAggRow[]>`
      SELECT
        clue_id,
        COUNT(*)::int AS total_hints
      FROM hint_usage_events
      WHERE hunt_id = ${huntId}
      GROUP BY clue_id
    `

    // ── 4. Build lookup maps ───────────────────────────────────────────────
    const avgMap = new Map<number, number>(
      avgRows.map((r) => [r.clue_id, r.avg_attempts]),
    )
    const hintMap = new Map<number, number>(
      hintRows.map((r) => [r.clue_id, r.total_hints]),
    )

    // ── 5. Assemble result rows ────────────────────────────────────────────
    // Sort by clue_id so position numbers are stable. Real hunts would join
    // against a clues table; here we derive position from the ordering.
    const sorted = [...answerRows].sort((a, b) => a.clue_id - b.clue_id)

    const clues: ClueAnalyticsRow[] = sorted.map((row, index) => {
      const solveRate =
        row.unique_players > 0
          ? Math.round((row.solvers / row.unique_players) * 1000) / 10
          : 0

      return {
        clueId: row.clue_id,
        position: index + 1,
        label: `Clue ${index + 1}`,
        totalAttempts: row.total_attempts,
        uniquePlayers: row.unique_players,
        solvers: row.solvers,
        solveRate,
        avgAttempts: avgMap.get(row.clue_id) ?? 0,
        hintsUsed: hintMap.get(row.clue_id) ?? 0,
        abandoned: solveRate < abandonmentThreshold,
      }
    })

    return { huntId, clues, abandonmentThreshold }
  } catch (err) {
    logger.error("[clueAnalytics] getClueAnalytics DB error:", err)
    return { huntId, clues: [], abandonmentThreshold }
  }
}
