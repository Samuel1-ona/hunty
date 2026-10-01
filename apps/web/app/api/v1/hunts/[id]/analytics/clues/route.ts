import { NextResponse } from "next/server"

import { ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getClueAnalytics } from "@/lib/clueAnalytics"
import { clueAnalyticsQuerySchema } from "@hunty/types/api-schemas"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/v1/hunts/:id/analytics/clues
 *
 * Returns per-clue analytics for a hunt: solve rate, average attempts,
 * hint usage, and an abandonment flag for clues below the requested threshold.
 *
 * Query params:
 *   threshold  — integer 0–100 (default 40).  Clues whose solve rate falls
 *                below this value are flagged as abandonment points.
 *
 * Response shape:
 *   { data: ClueAnalyticsResult }
 */
export const GET = withErrorHandling(async (req: Request, context: RouteContext) => {
  const ip = getIP(req)
  const { success, reset } = await rateLimit(ip, { limit: 60, windowMs: 60_000 })
  if (!success) {
    return rateLimitResponse(reset)
  }

  const { id } = await context.params
  const huntId = parseInt(id, 10)
  if (isNaN(huntId)) {
    throw new ValidationError("Invalid hunt ID", { id })
  }

  const { searchParams } = new URL(req.url)
  const queryResult = clueAnalyticsQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  )
  if (!queryResult.success) {
    throw new ValidationError("Invalid query parameters", {
      fieldErrors: queryResult.error.flatten().fieldErrors,
    })
  }

  const result = await getClueAnalytics(huntId, queryResult.data.threshold)

  return NextResponse.json({ data: result })
})
