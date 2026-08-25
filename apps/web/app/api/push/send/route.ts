import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit"
import { notifyWallet, notifyWallets } from "@/lib/notifications/pushService"
import type { PushEventType } from "@/lib/notifications/types"
import { AuthError, InternalError } from "@/lib/api/errors"
import { withValidation } from "@/lib/api/withValidation"
import { pushSendBodySchema } from "@hunty/types/api-schemas"

/**
 * POST /api/push/send
 *
 * Internal service-to-service endpoint for triggering Web Push notifications
 * on hunt events. Callers must present either PUSH_API_SECRET (the dedicated
 * push service credential) or ADMIN_API_SECRET (the shared admin credential
 * used elsewhere in this app) as a bearer token.
 *
 * Unlike @/lib/api/adminAuth's assertAdminAuth, this check is unconditional:
 * there is no "unprotected in dev when unset" fallback. If neither secret is
 * configured, every request is rejected — a push-fan-out endpoint has no
 * legitimate reason to ever run open.
 *
 * This must never be called directly from browser/client code: a secret
 * shipped in client JS isn't a secret. Trigger sends from server-side code
 * that already holds one of these credentials.
 *
 * Body:
 * {
 *   type: PushEventType,
 *   walletAddresses: string[],  // recipients
 *   context: Record<string, string | number>  // event-specific data (huntName, huntId, etc.)
 * }
 */
function assertServiceOrAdminAuth(request: Request): void {
  const authHeader = request.headers.get("Authorization") ?? ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

  const pushSecret = process.env.PUSH_API_SECRET
  const adminSecret = process.env.ADMIN_API_SECRET

  const matchesPush = Boolean(token && pushSecret && token === pushSecret)
  const matchesAdmin = Boolean(token && adminSecret && token === adminSecret)

  if (!matchesPush && !matchesAdmin) {
    throw new AuthError("A valid service or admin credential is required")
  }
}

export const POST = withValidation(
  { body: pushSendBodySchema },
  async (request: NextRequest, _context, { body }) => {
    const ip = getIP(request)
    const { success, reset } = await rateLimit(ip, { limit: 50, windowMs: 60 * 1000 })
    if (!success) return rateLimitResponse(reset)

    assertServiceOrAdminAuth(request)

    try {
      if (body.walletAddresses.length === 1) {
        await notifyWallet(body.walletAddresses[0], body.type as PushEventType, body.context)
      } else {
        await notifyWallets(body.walletAddresses, body.type as PushEventType, body.context)
      }
    } catch (error) {
      logger.error("[push/send] Failed to send push notification:", error)
      throw new InternalError("Failed to send push notification")
    }

    logger.info(
      `[push/send] Sent "${body.type}" to ${body.walletAddresses.length} wallet(s)`
    )

    return NextResponse.json({ success: true, sent: body.walletAddresses.length })
  }
)
