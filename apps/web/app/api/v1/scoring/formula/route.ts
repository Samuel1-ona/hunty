import { NextResponse } from "next/server";

import { HUNT_TIME_BONUS_CONFIG } from "@/lib/scoring";

/**
 * GET /api/v1/scoring/formula
 *
 * Returns the hunt-level time-based speed bonus formula and its parameters so
 * that players can see exactly how their completion speed affects their score.
 *
 * The bonus is applied on top of clue points when a player finishes a hunt.
 * It decays linearly from `maxBonus` (if you finish in near-zero time) down to
 * zero once `benchmarkSeconds` have elapsed.
 *
 * Formula (human-readable):
 *   timeBonus = floor(maxBonus × max(0, 1 − completionTimeSeconds / benchmarkSeconds))
 *
 * Examples at default config (maxBonus=500, benchmark=3600s):
 *   - Finish in  0 min → +500 pts
 *   - Finish in 15 min → +375 pts
 *   - Finish in 30 min → +250 pts
 *   - Finish in 45 min → +125 pts
 *   - Finish in 60 min →   +0 pts (no bonus)
 */
export async function GET() {
  const { maxBonus, benchmarkSeconds } = HUNT_TIME_BONUS_CONFIG;

  // Pre-compute a human-readable examples table so clients can render it
  // without having to replicate the formula.
  const exampleFractions = [0, 0.25, 0.5, 0.75, 1] as const;
  const examples = exampleFractions.map((fraction) => {
    const seconds = Math.round(fraction * benchmarkSeconds);
    const bonus = Math.floor(maxBonus * Math.max(0, 1 - fraction));
    return {
      completionTimeSeconds: seconds,
      completionTimeLabel: formatDuration(seconds),
      timeBonus: bonus,
    };
  });

  return NextResponse.json({
    formula: "floor(maxBonus × max(0, 1 − completionTimeSeconds / benchmarkSeconds))",
    description:
      "A speed bonus is added to your total score based on how quickly you complete the hunt. " +
      "The faster you finish, the bigger the bonus. " +
      `Finishing in ${Math.round(benchmarkSeconds / 60)} minutes or more earns no bonus.`,
    parameters: {
      maxBonus,
      benchmarkSeconds,
    },
    examples,
  });
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}
