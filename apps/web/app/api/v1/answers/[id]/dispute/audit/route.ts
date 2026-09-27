import { NextResponse } from "next/server"

import { ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { getAnswerDisputeAuditLog, getAnswerDisputesForAnswer } from "@/lib/answerDisputes"

export const GET = withErrorHandling(async (req: Request) => {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean)
  const answerId = segments[segments.length - 3] ?? null

  if (!answerId) {
    throw new ValidationError("answerId is required")
  }

  const disputes = getAnswerDisputesForAnswer(answerId)
  const auditLog = disputes.flatMap((dispute) =>
    getAnswerDisputeAuditLog(dispute.id).map((entry) => ({ ...entry, disputeId: dispute.id })),
  )

  return NextResponse.json({ answerId, auditLog })
})
