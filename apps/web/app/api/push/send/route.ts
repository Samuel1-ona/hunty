import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit"
import { notifyWallet, notifyWallets } from "@/lib/notifications/pushService"
import type { PushEventType } from "@/lib/notifications/types"
import { withErrorHandling } from "@/lib/api/withErrorHandling"

/**
 * POST /api/push/send
 *
 * NOTE (issue #865): this route's own docstring used to claim it was an
 * "internal endpoint... protected by a shared secret", but that secret
 * (PUSH_API_SECRET) is optional and, more importantly, this endpoint is
 * actually called directly from the browser with no auth header at all —
 * see `lib/notifications/notificationService.ts` (`sendOvertakePush`) and
 * `lib/hooks/useHuntMutations.ts` (`useActivateHuntMutation`), both
 * client-side `fetch("/api/push/send", ...)` calls with no Authorization
 * header and no wallet identity field. Gating this behind `withAdminAuth`
 * (as its docstring implied) would 401 every real caller and break
 * opt-in push notifications for all users, since there is no
 * legitimate way for a browser to hold the admin secret.
 *
 * Left public and rate-limited, same as before, rather than silently
 * "fixed" in a way that breaks the feature. Tracked as a follow-up: this
 * needs a real abuse control (e.g. per-recipient rate limiting, or moving
 * the trigger server-side into the mutation that causes it) rather than a
 * bearer-token gate a browser can't hold. See the PR report for details.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
    const ip = getIP(request)
    const { success, reset } = await rateLimit(ip, { limit: 50, windowMs: 60 * 1000 })
    if (!success) return rateLimitResponse(reset)

    let body: { type?: string; walletAddresses?: string[]; context?: Record<string, string | number> }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { type, walletAddresses, context = {} } = body

    if (!type || typeof type !== "string") {
      return NextResponse.json({ error: "type is required" }, { status: 400 })
    }

    if (!Array.isArray(walletAddresses) || walletAddresses.length === 0) {
      return NextResponse.json(
        { error: "walletAddresses must be a non-empty array" },
        { status: 400 }
      )
    }

    const validTypes: PushEventType[] = [
      "hunt_start",
      "hunt_cancelled",
      "leaderboard_overtake",
      "player_registered",
      "first_completion",
    ]

    if (!validTypes.includes(type as PushEventType)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    try {
      if (walletAddresses.length === 1) {
        await notifyWallet(walletAddresses[0], type as PushEventType, context)
      } else {
        await notifyWallets(walletAddresses, type as PushEventType, context)
      }
    } catch (error) {
      logger.error("[push/send] Failed to send push notification:", error)
      return NextResponse.json(
        { error: "Failed to send push notification" },
        { status: 500 }
      )
    }

    logger.info(
      `[push/send] Sent "${type}" to ${walletAddresses.length} wallet(s)`
    )

    return NextResponse.json({ success: true, sent: walletAddresses.length })
})
