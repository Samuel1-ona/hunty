import { NextResponse } from "next/server"

import { withErrorHandling } from "/lib/api/withErrorHandling"
import { getIP, rateLimit, rateLimitResponse } from "/lib/rate-limit"
import { getCreatorPayoutSummary } from "/lib/payouts"
import { Keypair } from "stellar-sdk"

/**
 * Verifies that a request is signed by the wallet that owns the given Stellar address.
 * Expects `x-signature` (base64) and `x-timestamp` (ISO 8601) headers. The signed
 * message is `${creator}:${timestamp}`. To prevent replay, the timestamp must be
 * within 5 minutes of the server time.
 */
function verifyWalletOwnership(creator: string, req: Request): NextResponse | null {
  const signature = req.headers.get("x-signature")
  const timestamp = req.headers.get("x-timestamp")

  if (!signature || !timestamp) {
    return NextResponse.json({ error: "Missing signature or timestamp" }, { status: 401 })
  }

  const ts = new Date(timestamp).getTime()
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    return NextResponse.json({ error: "Expired or invalid timestamp" }, { status: 401 })
  }

  const message = `${creator}:$timestamp}`
  const keypair = Keypair.fromPublicKey(creator)
  const valid = keypair.verify(Buffer.from(message, "utf8"), Buffer.from(signature, "base64"))
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  return null
}

/**
 * GET /api/v1/payouts
*
 * Returns a consolidated creator payout dashboard.
 *
 * Query params:
 *   - creator: optional Stellar address. When omitted, all escrows are returned.
 *   When supplied, the request must be signed by the creator wallet.
 *   See `verifyWalletOwnership` for the required headers.
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

  // When a creator is specified, prove ownership by signing a challenge.
  if (creator) {
    const authError = verifyWalletOwnership(creator, req)
    if (authError) return authError
  }

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
