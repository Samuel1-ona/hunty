/**
 * Cron/queue worker for durable hunt schedules.
 *
 * This endpoint is meant to be invoked by an EXTERNAL scheduler — a Vercel Cron
 * Job, a GitHub Actions workflow, or a queue consumer — on a fixed interval. It
 * deliberately does not start an in-process timer: serverless instances are
 * frozen and recycled between requests, which is exactly why the previous
 * in-memory schedules never fired after a restart.
 *
 * Configure the scheduler to call:
 *
 *   POST /api/cron/hunt-schedules
 *   Authorization: Bearer $CRON_SECRET
 *
 * Every invocation re-reads the due rows in `hunt_schedules` (migration 012),
 * applies the pure decisions from `@/lib/huntScheduling`, persists the new
 * statuses, sends start reminders, and returns a summary.
 */

import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { processDueHuntSchedules } from "@/lib/huntScheduleStore"
import { logger } from "@/lib/logger"
import { sendHuntStartReminder } from "@/lib/notifications/huntScheduleNotifications"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function readBearerToken(header: string | null): string | null {
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match ? match[1].trim() : null
}

/** Length-safe constant-time comparison of two secrets. */
function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf-8")
  const rightBuffer = Buffer.from(right, "utf-8")
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

export async function POST(request: Request) {
  const provided = readBearerToken(request.headers.get("authorization"))
  const secret = process.env.CRON_SECRET

  // Fail closed: without a configured secret the worker must never run, and
  // unauthenticated callers get the same 401 as any other rejected request.
  if (!secret || !provided || !safeEqual(provided, secret)) {
    if (!secret) logger.error("[cron/hunt-schedules] CRON_SECRET is not configured")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await processDueHuntSchedules({
      sendReminder: (payload) => sendHuntStartReminder(payload),
    })

    logger.info(
      `[cron/hunt-schedules] considered=${result.considered} transitions=${result.transitions.length} reminders=${result.reminders.length} sent=${result.sent}`
    )

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    logger.error("Failed to process hunt schedules", error)
    return NextResponse.json({ error: "Failed to process hunt schedules" }, { status: 500 })
  }
}
