import { NextResponse } from "next/server"

import { ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { getAnswerDisputeAuditLog, getAnswerDisputeById, resolveAnswerDispute } from "@/lib/answerDisputes"

export const GET = withErrorHandling(async (req: Request) => {
  const url = new URL(req.url)
  const disputeId = url.pathname.split("/").filter(Boolean).at(-1)

  if (!disputeId) {
    throw new ValidationError("Dispute ID is required")
  }

  const dispute = getAnswerDisputeById(disputeId)
  if (!dispute) {
    return NextResponse.json({ dispute: null }, { status: 404 })
  }

  return NextResponse.json({ dispute })
})

export const PATCH = withErrorHandling(async (req: Request) => {
  const url = new URL(req.url)
  const disputeId = url.pathname.split("/").filter(Boolean).at(-1)

  if (!disputeId) {
    throw new ValidationError("Dispute ID is required")
  }

  let body: {
    reviewer?: string
    decision?: "approved" | "rejected" | "override" | "reviewed"
    note?: string
  }

  try {
    body = await req.json()
  } catch {
    throw new ValidationError("Invalid request body")
  }

  if (!body.reviewer || typeof body.reviewer !== "string" || body.reviewer.trim().length === 0) {
    throw new ValidationError("reviewer is required", { field: "reviewer" })
  }

  const updated = resolveAnswerDispute(disputeId, {
    reviewer: body.reviewer.trim(),
    decision: body.decision ?? "reviewed",
    note: body.note,
  })

  if (!updated) {
    return NextResponse.json({ dispute: null }, { status: 404 })
  }

  return NextResponse.json({ dispute: updated, auditLog: getAnswerDisputeAuditLog(disputeId) })
})
