import { NextResponse } from "next/server"
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit"
import { recordHintUsage, getHintUsageStats } from "@/lib/analytics"
import { logger } from "@/lib/logger"
import { withValidation } from "@/lib/api/withValidation"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { hintUsageBodySchema, hintUsageQuerySchema } from "@hunty/types/api-schemas"

/**
 * POST /api/analytics/hint-usage
 * Body: { huntId: number; clueId: number; hintIndex: number; wallet: string }
 *
 * Records a hint reveal event. The wallet address is hashed server-side before
 * storage — raw addresses are never persisted.
 */
export const POST = withValidation(
  { body: hintUsageBodySchema },
  async (req, _context, { body }) => {
    const ip = getIP(req)
    const { success, reset } = await rateLimit(ip, { limit: 60, windowMs: 60_000 })
    if (!success) return rateLimitResponse(reset)

    try {
      await recordHintUsage(body.huntId, body.clueId, body.hintIndex, body.wallet.trim())
      return NextResponse.json({ ok: true }, { status: 200 })
    } catch (error) {
      // Analytics errors must never break gameplay
      logger.error("Failed to record hint usage analytics:", error)
      return NextResponse.json({ ok: true }, { status: 200 })
    }
  }
)

/**
 * GET /api/analytics/hint-usage?huntId=<n>
 *
 * Returns aggregated hint reveal counts for a hunt.
 * Intended for creator dashboards; no auth in this mock implementation.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const { searchParams } = new URL(req.url)
  const raw = Object.fromEntries(searchParams.entries())
  const queryResult = hintUsageQuerySchema.safeParse(raw)
  if (!queryResult.success) {
    return NextResponse.json(
      { error: "huntId query param is required and must be a positive integer" },
      { status: 400 }
    )
  }

  try {
    const stats = await getHintUsageStats(queryResult.data.huntId)
    return NextResponse.json({ huntId: queryResult.data.huntId, stats }, { status: 200 })
  } catch (error) {
    logger.error("Failed to fetch hint usage stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
})
