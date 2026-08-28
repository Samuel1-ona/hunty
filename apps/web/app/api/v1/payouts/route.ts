import { NextResponse } from "next/server"

import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getCreatorPayoutSummary } from "@/lib/payouts"

/**
 * GET /api/v1/payouts
 *
 * Returns a consolidated creator payout dashboard.
 *
 * Query params:
 *   - creator: optional Stellar address. When omitted, all escrows are returned.
 *
 * Response: per-hunt totals (escrowed / paid / remaining / refunded), linked
 * on-chain transactions, and reconciliation against the on-chain escrow state.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const ip = getIP(req)
  const { success, reset } = await rateLimit(ip, { limit: 60, windowMs: 60_000 })
  if (!success) return rateLimitResponse(reset)

  const { searchParams } = new URL(req.url)
  const creator = searchParams.get("creator") ?? undefined

  const summary = getCreatorPayoutSummary(creator)

  return NextResponse.json({
    creator: summary.creator,
    totals: {
      escrowed: summary.totalEscrowed,
      paid: summary.totalPaid,
      refunded: summary.totalRefunded,
      remaining: summary.totalRemaining,
    },
    fullyReconciled: summary.fullyReconciled,
    rows: summary.rows,
  })
})
