import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit"
import { notifyWallet, notifyWallets } from "@/lib/notifications/pushService"
import type { PushEventType } from "@/lib/notifications/types"

/**
 * POST /api/push/send
 *
 * Internal endpoint for triggering Web Push notifications on hunt events.
 * Protected by a shared secret via the Authorization header.
 *
 * Body:
 * {
 *   type: PushEventType,
 *   walletAddresses: string[],  // recipients
 *   context: Record<string, string | number>  // event-specific data (huntName, huntId, etc.)
 * }
 */
export async function POST(request: NextRequest) {
  const ip = getIP(request)
  const { success, reset } = rateLimit(ip, { limit: 50, windowMs: 60 * 1000 })
  if (!success) return rateLimitResponse(reset)

  const secret = process.env.PUSH_API_SECRET
  if (secret) {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

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
}
