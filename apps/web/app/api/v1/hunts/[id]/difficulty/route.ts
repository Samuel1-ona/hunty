import { NextResponse } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { computeDifficulty } from "@/lib/computeDifficulty";

/**
 * GET /api/v1/hunts/[id]/difficulty
 *
 * Returns a computed difficulty label and supporting statistics for a hunt
 * derived from real player completion data:
 *
 * ```json
 * {
 *   "huntId":          42,
 *   "label":           "Hard",
 *   "completionRate":  0.28,
 *   "avgSolveTimeMs":  2700000,
 *   "totalAttempts":   18,
 *   "totalCompletions": 5,
 *   "reliable":        true
 * }
 * ```
 *
 * `label` is one of: `"Easy"` | `"Medium"` | `"Hard"` | `"Expert"`.
 *
 * When fewer than 5 players have started the hunt, `reliable` is `false` and
 * the label is provisional. Front-ends should indicate this with a visual cue
 * (e.g. the `~` prefix already applied by `DifficultyBadge`).
 *
 * Because difficulty is recomputed from the live progress store on every
 * request the value automatically updates as more players finish.
 */
export const GET = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (req, { params }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, {
      limit: 120,
      windowMs: 60 * 1000,
    });

    if (!success) {
      return rateLimitResponse(reset);
    }

    const { id } = await params;
    const huntId = parseInt(id, 10);

    if (isNaN(huntId)) {
      throw new ValidationError("Invalid hunt ID", { id });
    }

    const difficulty = computeDifficulty(huntId);

    return NextResponse.json(difficulty);
  },
);
