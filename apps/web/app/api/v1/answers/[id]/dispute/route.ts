import { NextResponse } from "next/server"

import { ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { createAnswerDispute, getAnswerDisputesForAnswer } from "@/lib/answerDisputes"

export const GET = withErrorHandling(async (req: Request) => {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean)
  const answerId = segments[segments.length - 2] ?? null

  if (!answerId) {
    throw new ValidationError("answerId is required")
  }

  return NextResponse.json({ disputes: getAnswerDisputesForAnswer(answerId) })
})

export const POST = withErrorHandling(async (req: Request) => {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean)
  const answerId = segments[segments.length - 2] ?? null

  if (!answerId) {
    throw new ValidationError("answerId is required")
  }

  let body: {
    huntId?: number
    clueId?: number
    playerWallet?: string
    submittedAnswer?: string
    rejectedReason?: string
  }

  try {
    body = await req.json()
  } catch {
    throw new ValidationError("Invalid request body")
  }

  if (!body.huntId || typeof body.huntId !== "number") {
    throw new ValidationError("huntId is required", { field: "huntId" })
  }
  if (!body.clueId || typeof body.clueId !== "number") {
    throw new ValidationError("clueId is required", { field: "clueId" })
  }
  if (!body.playerWallet || typeof body.playerWallet !== "string" || body.playerWallet.trim().length === 0) {
    throw new ValidationError("playerWallet is required", { field: "playerWallet" })
  }
  if (!body.submittedAnswer || typeof body.submittedAnswer !== "string" || body.submittedAnswer.trim().length === 0) {
    throw new ValidationError("submittedAnswer is required", { field: "submittedAnswer" })
  }

  const dispute = createAnswerDispute({
    answerId,
    huntId: body.huntId,
    clueId: body.clueId,
    playerWallet: body.playerWallet,
    submittedAnswer: body.submittedAnswer.trim(),
    rejectedReason: body.rejectedReason,
  })

  return NextResponse.json({ dispute }, { status: 201 })
})
