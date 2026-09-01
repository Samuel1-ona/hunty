import { NextRequest, NextResponse } from "next/server"
import { getHuntAnalytics, buildAnalyticsCsv } from "@/lib/huntAnalytics"
import { CACHE_TTL_SECONDS } from "@/lib/analyticsCache"

/**
 * GET /api/analytics/[huntId]
 *
 * Returns full analytics for a single hunt.
 * Accepts an optional `format=csv` query param to download a CSV export.
 *
 * Responses are served from an in-process cache (or Upstash Redis when
 * UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set).  The TTL is
 * controlled by ANALYTICS_CACHE_TTL_SECONDS (default 60s).
 *
 * Cache-Control is set on the JSON response so CDN/browser layers also benefit.
 * CSV exports skip the Cache-Control header so downloads always reflect the
 * most recently cached state without accumulating stale files client-side.
 *
 * Response (JSON):
 * ```json
 * {
 *   "huntId": 1,
 *   "views": 42,
 *   "starts": 30,
 *   "completions": 18,
 *   "completionRate": 60,
 *   "avgCompletionTimeSeconds": 1234,
 *   "clueDropOff": [...],
 *   "demographics": [...],
 *   "timeSeries": [...],
 *   "updatedAt": "..."
 * }
 * ```
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ huntId: string }> }
) {
  const { huntId: huntIdParam } = await params
  const huntId = Number(huntIdParam)

  if (!Number.isFinite(huntId) || huntId <= 0) {
    return NextResponse.json({ error: "Invalid huntId" }, { status: 400 })
  }

  const analytics = await getHuntAnalytics(Math.floor(huntId))

  const url = new URL(request.url)
  const format = url.searchParams.get("format")

  if (format === "csv") {
    const csv = buildAnalyticsCsv(analytics)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="hunt-${huntId}-analytics.csv"`,
      },
    })
  }

  return NextResponse.json(analytics, {
    headers: {
      "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
    },
  })
}
