import { NextResponse } from "next/server"
import {
  approveSubmission,
  flagContentPolicyViolation,
  getAllSubmissions,
  getPendingSubmissions,
  rejectSubmission,
} from "@/lib/moderation/dbStore"
import { sendModerationActionEmail } from "@/lib/moderation/email"
import { assertAdminAuth } from "@/lib/api/adminAuth"
import { withValidation } from "@/lib/api/withValidation"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import {
  adminModerationBodySchema,
  adminModerationQuerySchema,
} from "@hunty/types/api-schemas"

export const GET = withErrorHandling(async (req: Request) => {
  assertAdminAuth(req)
  const { searchParams } = new URL(req.url)
  const view = searchParams.get("view") || "pending"

  const queryResult = adminModerationQuerySchema.safeParse({ view })
  if (!queryResult.success) {
    return NextResponse.json({ error: "Invalid view parameter" }, { status: 400 })
  }

  if (queryResult.data.view === "all") {
    return NextResponse.json({ submissions: await getAllSubmissions() })
  }

  return NextResponse.json({ submissions: await getPendingSubmissions() })
})

export const POST = withValidation(
  { body: adminModerationBodySchema },
  async (req, _context, { body }) => {
    assertAdminAuth(req)

    if (body.action === "approve") {
      const updated = await approveSubmission(body.submissionId, body.reviewedBy ?? "admin")
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

    if (body.action === "reject") {
      const updated = await rejectSubmission(
        body.submissionId,
        body.reason,
        body.policyViolations ?? [],
        body.reviewedBy ?? "admin"
      )
      if (!updated) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 })
      }
      if (updated.creatorEmail) {
        await sendModerationActionEmail({
          huntName: updated.hunt.title,
          creatorEmail: updated.creatorEmail,
          action: "rejected",
          reason: body.reason,
        })
      }
      return NextResponse.json({ success: true, submission: updated })
    }

    // action === "flag"
    const updated = await flagContentPolicyViolation(body.submissionId, body.policyViolations)
    if (!updated) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, submission: updated })
  }
)
