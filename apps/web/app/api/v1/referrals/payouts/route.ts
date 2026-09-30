import { referralPayoutBodySchema } from "@hunty/types/api-schemas"
import { NextResponse } from "next/server"

import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { withValidation } from "@/lib/api/withValidation"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getAllPayouts, processReferralPayouts } from "@/lib/referralStore"
import { referralPayoutBodySchema } from "@hunty/types/api-schemas"
import { assertAdminAuth } from "@/lib/api/adminAuth"
import { AuthError } from "@/lib/api/errors"
import { constantTimeEqual } from "@/lib/api/timingSafeCompare"
import { auditLog } from "@/lib/audit"

/**
 * Verifies the request comes from an admin.
 *
 * Accepts either:
 *  - A valid `x-admin-key` header matching `process.env.ADMIN_API_KEY` (for
 *    background jobs / CI pipelines), or
 *  - A NextAuth session JWT with `role === "admin"` (for interactive admin UI).
 *
 * Throws `AuthError` (401) when neither credential is present or valid.
 */
async function requireAdmin(req: Request) {
  const adminKey = req.headers.get("x-admin-key")

  if (adminKey !== null) {
    if (adminKey !== process.env.ADMIN_API_KEY) {
      auditLog(
        "referral-payouts.unauthorized",
        { reason: "invalid_api_key", path: new URL(req.url).pathname },
        "api-key"
      )
      throw new AuthError("Invalid API key")
    }
    return { id: "api-key", email: "api-key@internal", role: "admin" }
  }

  // Falls through to session-based auth; assertAdminAuth throws on failure.
  return assertAdminAuth(req)
}

// ─── GET /api/v1/referrals/payouts ────────────────────────────────────────────

/**
 * Returns all referral payout records (pending, processing, paid, failed).
 * Read-only — no authentication required.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const ip = getIP(req)
  const { success, reset } = await rateLimit(ip, rateLimitPresets.read)
  if (!success) return rateLimitResponse(reset)

  const admin = await requireAdmin(req)

  auditLog("referral-payouts.list", { path: new URL(req.url).pathname }, admin.id)

  const payouts = getAllPayouts()
  return NextResponse.json({ payouts, total: payouts.length })
})

// ─── POST /api/v1/referrals/payouts ───────────────────────────────────────────

/**
 * Calculates and optionally executes reward payout allocations for top referrers.
 *
 * Admin-only: only an admin session or a background-job API key may call this.
 * The actor is derived from the verified identity, not the request body.
 *
 * When execute=false (default), returns a dry-run preview without persisting anything.
 * When execute=true, creates payout records with status "pending".
 *
 * Authorization: Only admins and authorised background jobs may call this endpoint.
 *   - Admin session: valid NextAuth JWT with role === "admin"
 *   - Background job: X-Admin-Token header matching ADMIN_API_TOKEN env var
 *
 * The acting identity is always derived from the verified credential, never from
 * the request body.
 *
 * Default reward tiers (caller may supply any allocations array):
 *   Rank 1 → 750 pts
 *   Rank 2 → 450 pts
 *   Rank 3 → 200 pts
 *
 * Request body: { period, allocations: [{ rank, referrerAddress, amount, rewardType }], execute? }
 *
 * Errors:
 *   401 – no valid session or API token provided
 *   403 – authenticated but lacks admin role
 */
export const POST = withValidation(
  { body: referralPayoutBodySchema },
  async (req: Request, _context, { body }) => {
    const ip = getIP(req)
    const { success, reset } = await rateLimit(ip, rateLimitPresets.sensitive)
    if (!success) return rateLimitResponse(reset)

    // ── Authorization ────────────────────────────────────────────────────────
    //
    // Accept either:
    //   (a) an admin NextAuth session (interactive callers / dashboards), or
    //   (b) a shared secret via X-Admin-Token (background jobs / cron).
    //
    // The actor identity is always derived from the verified credential, never
    // from the request body.

    let actor: string

    const jobToken = req.headers.get("x-admin-token")
    const adminApiToken = process.env.ADMIN_API_TOKEN

    if (jobToken !== null) {
      // Background-job path: validate the shared secret with constant-time compare.
      if (!adminApiToken || !constantTimeEqual(jobToken, adminApiToken)) {
        auditLog(
          "unauthorized",
          { path: new URL(req.url).pathname, reason: "invalid_job_token" },
          "anonymous"
        )
        throw new AuthError("Unauthorized")
      }
      actor = "background-job"
    } else {
      // Interactive admin path: assert a valid NextAuth session with admin role.
      // assertAdminAuth throws AuthError (401) or ForbiddenError (403) on failure.
      const adminUser = await assertAdminAuth(req)
      actor = adminUser.id
    }

    // ── Business logic ───────────────────────────────────────────────────────

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

    if (body.execute) {
      auditLog(
        "referral_payouts_executed",
        {
          path: new URL(req.url).pathname,
          period: body.period,
          allocationCount: body.allocations.length,
        },
        actor
      )
    }

    return NextResponse.json(result, { status: body.execute ? 201 : 200 })
  }
)
