import { NextResponse } from "next/server"
import { withValidation } from "@/lib/api/withValidation"
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import {
  getReferralLeaderboard,
  getReferralLeaderboardStats,
  getReferrerRank,
} from "@/lib/referralStore"
import { referralLeaderboardQuerySchema } from "@hunty/types/api-schemas"
import type { ReferralLeaderboardPeriod } from "@/lib/types"

/**
 * GET /api/v1/referrals/leaderboard
 *
 * Returns a ranked leaderboard of referrers sorted by successful referrals (desc).
 *
 * Query params (all optional):
 *   limit   – max entries (default 50, max 200)
 *   period  – "all" | "week" | "month" (default "all")
 *   address – Stellar G-address; if supplied, also returns that player's rank
 */
export const GET = withValidation(
  { query: referralLeaderboardQuerySchema },
  async (req: Request, _context, { query }) => {
    const ip = getIP(req)
    const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60_000 })
    if (!success) return rateLimitResponse(reset)

    const period = (query.period ?? "all") as ReferralLeaderboardPeriod
    const limit = query.limit ?? 50

    const leaderboard = getReferralLeaderboard({ period, limit })
    const stats = getReferralLeaderboardStats()

    const playerRank = query.address
      ? getReferrerRank(query.address, period)
      : null

    return NextResponse.json({
      leaderboard,
      stats,
      ...(playerRank !== null ? { playerRank } : {}),
      period,
      generatedAt: Date.now(),
    })
  }
)
