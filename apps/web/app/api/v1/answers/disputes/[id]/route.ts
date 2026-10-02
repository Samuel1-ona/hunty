import { NextRequest, NextResponse } from "next/server"

import { getAnswerDisputeAuditLog, getAnswerDisputeById, resolveAnswerDispute } from "@/lib/answerDisputes"
import { ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { getHuntById } from "@/lib/huntStore"
import { verifyCallerAuth } from "@/lib/walletAuth"

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

  let body: Record<string, any> = {}

  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const auth = await verifyCallerAuth(req as NextRequest, body)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error || "Unauthenticated" }, { status: auth.status || 401 })
  }

  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 403 })
  }

  const actor = auth.actor!

  const dispute = getAnswerDisputeById(disputeId)
  if (!dispute) {
    return NextResponse.json({ dispute: null }, { status: 404 })
  }

  const hunt = getHuntById(dispute.huntId)
  if (hunt && hunt.creator) {
    const isSessionAdmin = actor.startsWith("sess_") || actor === "session_authenticated_admin"
    const isCreator = hunt.creator.toLowerCase() === actor.toLowerCase()
    if (!isCreator && !isSessionAdmin) {
      return NextResponse.json(
        { error: "Forbidden: only the hunt creator can resolve disputes" },
        { status: 403 }
      )
    }
  }

  const updated = resolveAnswerDispute(disputeId, {
    reviewer: actor,
    decision: body.decision ?? "reviewed",
    note: body.note,
  })

  if (!updated) {
    return NextResponse.json({ dispute: null }, { status: 404 })
  }

  return NextResponse.json({ dispute: updated, auditLog: getAnswerDisputeAuditLog(disputeId) })
})

