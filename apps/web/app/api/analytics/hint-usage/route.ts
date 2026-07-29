import { NextResponse } from "next/server"
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit"
import { recordHintUsage, getHintUsageStats } from "@/lib/analytics"
import { logger } from "@/lib/logger"

/**
 * POST /api/analytics/hint-usage
 * Body: { huntId: number; clueId: number; hintIndex: number; wallet: string }
 *
 * Records a hint reveal event. The wallet address is hashed server-side before
 * storage — raw addresses are never persisted.
 */
export async function POST(req: Request) {
  const ip = getIP(req)
  const { success, reset } = await rateLimit(ip, { limit: 60, windowMs: 60_000 })
  if (!success) return rateLimitResponse(reset)

  let body: { huntId?: unknown; clueId?: unknown; hintIndex?: unknown; wallet?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { huntId, clueId, hintIndex, wallet } = body

  if (typeof huntId !== "number" || huntId <= 0) {
    return NextResponse.json({ error: "huntId must be a positive number" }, { status: 400 })
  }
  if (typeof clueId !== "number" || clueId <= 0) {
    return NextResponse.json({ error: "clueId must be a positive number" }, { status: 400 })
  }
  if (typeof hintIndex !== "number" || hintIndex < 0 || hintIndex > 2) {
    return NextResponse.json({ error: "hintIndex must be 0, 1, or 2" }, { status: 400 })
  }
  if (typeof wallet !== "string" || wallet.trim().length === 0) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 })
  }

  try {
    await recordHintUsage(huntId, clueId, hintIndex, wallet.trim())
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    // Analytics errors must never break gameplay
    logger.error("Failed to record hint usage analytics:", error)
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}

/**
 * GET /api/analytics/hint-usage?huntId=<n>
 *
 * Returns aggregated hint reveal counts for a hunt.
 * Intended for creator dashboards; no auth in this mock implementation.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const huntIdParam = searchParams.get("huntId")
  const huntId = huntIdParam ? Number(huntIdParam) : NaN

  if (!huntId || Number.isNaN(huntId)) {
    return NextResponse.json({ error: "huntId query param is required" }, { status: 400 })
  }

  try {
    const stats = await getHintUsageStats(huntId)
    return NextResponse.json({ huntId, stats }, { status: 200 })
  } catch (error) {
    logger.error("Failed to fetch hint usage stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
