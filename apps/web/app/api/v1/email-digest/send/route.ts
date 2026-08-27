/**
 * POST /api/v1/email-digest/send
 *
 * Admin endpoint to trigger email digest sends.
 * Sends to all subscribed players who haven't received a digest recently.
 *
 * Requires:
 * - X-Admin-Token header matching ADMIN_API_TOKEN
 *
 * Query params:
 * - dryRun: true/false (default: false) - simulate without actually sending
 * - minHours: number (default: 24) - minimum hours since last digest
 */

import { NextResponse } from "next/server"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { ValidationError } from "@/lib/api/errors"
import { sendDigestBatch } from "@/lib/email/sendDigest"

const adminToken = process.env.ADMIN_API_TOKEN

export const POST = withErrorHandling(async (req: Request) => {
  // Verify admin token
  const authHeader = req.headers.get("x-admin-token")
  if (!adminToken || authHeader !== adminToken) {
    throw new ValidationError("Unauthorized: invalid or missing admin token", {})
  }

  const { searchParams } = new URL(req.url)
  const dryRun = searchParams.get("dryRun") === "true"
  const minHours = Math.max(1, parseInt(searchParams.get("minHours") || "24", 10))

  // Send digests
  const result = await sendDigestBatch({
    minHoursSinceLast: minHours,
    dryRun,
  })

  return NextResponse.json({
    success: true,
    dryRun,
    minHoursSinceLast: minHours,
    ...result,
    message: dryRun
      ? "Dry run completed (no emails actually sent)"
      : `Digest batch sent to ${result.sent} players`,
  })
})
