import { NextRequest, NextResponse } from "next/server"
import {
  approveSubmission,
  flagContentPolicyViolation,
  getAllSubmissions,
  getPendingSubmissions,
  rejectSubmission,
} from "@/lib/moderation/store"
import { sendModerationActionEmail } from "@/lib/moderation/email"
import type { ContentPolicyViolation } from "@/lib/moderation/types"
import { assertAdminAuth } from "@/lib/api/adminAuth"

export async function GET(req: NextRequest) {
  assertAdminAuth(req)
  const { searchParams } = new URL(req.url)
  const view = searchParams.get("view") || "pending"

  if (view === "all") {
    return NextResponse.json({ submissions: getAllSubmissions() })
  }

  return NextResponse.json({ submissions: getPendingSubmissions() })
}

export async function POST(req: NextRequest) {
  assertAdminAuth(req)
  let body: {
    action?: string
    submissionId?: string
    reason?: string
    policyViolations?: ContentPolicyViolation[]
    reviewedBy?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { action, submissionId } = body
  if (!submissionId) {
    return NextResponse.json({ error: "submissionId is required" }, { status: 400 })
  }

  if (action === "approve") {
    const updated = approveSubmission(submissionId, body.reviewedBy || "admin")
    if (!updated) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }
    if (updated.creatorEmail) {
      await sendModerationActionEmail({
        huntName: updated.hunt.title,
        creatorEmail: updated.creatorEmail,
        action: "approved",
      })
    }
    return NextResponse.json({ success: true, submission: updated })
  }

  if (action === "reject") {
    const reason = body.reason?.trim()
    if (!reason) {
      return NextResponse.json({ error: "reason is required to reject" }, { status: 400 })
    }
    const updated = rejectSubmission(
      submissionId,
      reason,
      body.policyViolations ?? [],
      body.reviewedBy || "admin"
    )
    if (!updated) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }
    if (updated.creatorEmail) {
      await sendModerationActionEmail({
        huntName: updated.hunt.title,
        creatorEmail: updated.creatorEmail,
        action: "rejected",
        reason,
      })
    }
    return NextResponse.json({ success: true, submission: updated })
  }

  if (action === "flag") {
    const violations = body.policyViolations
    if (!violations?.length) {
      return NextResponse.json({ error: "policyViolations is required" }, { status: 400 })
    }
    const updated = flagContentPolicyViolation(submissionId, violations)
    if (!updated) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, submission: updated })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
