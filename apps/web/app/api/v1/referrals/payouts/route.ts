import { NextResponse } from "next/server"
import { withValidation } from "@/lib/api/withValidation"
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { getAllPayouts, processReferralPayouts } from "@/lib/referralStore"
import { referralPayoutBodySchema } from "@hunty/types/api-schemas"

/**
 * GET /api/v1/referrals/payouts
 *
 * Returns all referral payout records (pending, processing, paid, failed).
 */
export const GET = withErrorHandling(async (req: Request) => {
  const ip = getIP(req)
  const { success, reset } = await rateLimit(ip, { limit: 60, windowMs: 60_000 })
  if (!success) return rateLimitResponse(reset)

  const payouts = getAllPayouts()
  return NextResponse.json({ payouts, total: payouts.length })
})

/**
 * POST /api/v1/referrals/payouts
 *
 * Calculates and optionally executes reward payout allocations for top referrers.
 *
 * When execute=false (default), returns a dry-run preview without persisting anything.
 * When execute=true, creates payout records with status "pending".
 *
 * Default reward tiers (caller may supply any allocations array):
 *   Rank 1 → 750 pts
 *   Rank 2 → 450 pts
 *   Rank 3 → 200 pts
 *
 * Request body: { period, allocations: [{ rank, referrerAddress, amount, rewardType }], execute? }
 */
export const POST = withValidation(
  { body: referralPayoutBodySchema },
  async (req: Request, _context, { body }) => {
    const ip = getIP(req)
    const { success, reset } = await rateLimit(ip, { limit: 10, windowMs: 60_000 })
    if (!success) return rateLimitResponse(reset)

    const result = processReferralPayouts(
      body.period,
      body.allocations.map((a) => ({
        rank: a.rank,
        referrerAddress: a.referrerAddress,
        amount: a.amount,
        rewardType: a.rewardType,
      })),
      body.execute
    )

    return NextResponse.json(result, { status: body.execute ? 201 : 200 })
  }
)
