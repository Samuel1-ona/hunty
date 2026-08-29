import { NextRequest, NextResponse } from "next/server"
import {
  getCreatorNotifications,
  getModerationStatusForHunts,
  markNotificationRead,
} from "@/lib/moderation/dbStore"
import { assertAdminAuth } from "@/lib/api/adminAuth"
import { NotFoundError, RateLimitError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { withValidation } from "@/lib/api/withValidation"
import { getIP, rateLimit } from "@/lib/rate-limit"
import { moderationSyncBodySchema } from "@hunty/types/api-schemas"

export const GET = withErrorHandling(async (req: NextRequest) => {
  assertAdminAuth(req)

  const ip = getIP(req)
  const ipResult = rateLimit(`sync_ip:${ip}`, { limit: 60, windowMs: 60 * 1000 })
  if (!ipResult.success) {
    throw new RateLimitError("Too many sync requests from this IP", {
      reset: ipResult.reset,
      remaining: ipResult.remaining,
    })
  }

  const { searchParams } = new URL(req.url)
  const email = searchParams.get("email") || undefined
  const huntIdsParam = searchParams.get("huntIds")

  if (huntIdsParam) {
    const huntIds = huntIdsParam
      .split(",")
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !Number.isNaN(id))
    return NextResponse.json({ statuses: await getModerationStatusForHunts(huntIds) })
  }

  return NextResponse.json({ notifications: await getCreatorNotifications(email) })
})

export const POST = withErrorHandling(
  withValidation(
    { body: moderationSyncBodySchema },
    async (req: NextRequest, _context, { body }) => {
      assertAdminAuth(req)

      const ip = getIP(req)
      const ipResult = rateLimit(`sync_ip:${ip}`, { limit: 60, windowMs: 60 * 1000 })
      if (!ipResult.success) {
        throw new RateLimitError("Too many sync requests from this IP", {
          reset: ipResult.reset,
          remaining: ipResult.remaining,
        })
      }

      const ok = await markNotificationRead(body.notificationId)
      if (!ok) {
        throw new NotFoundError("Notification not found")
      }
      return NextResponse.json({ success: true })
    }
  )
)
