import { NextResponse } from "next/server"

import { ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { createAnswerDispute, getAnswerDisputesForAnswer } from "@/lib/answerDisputes"

export const GET = withErrorHandling(async (req: Request) => {
  const { searchParams } = new URL(req.url)
  const answerId = searchParams.get("answerId")

  if (!answerId) {
    return NextResponse.json({ disputes: [] })
  }

  return NextResponse.json({ disputes: getAnswerDisputesForAnswer(answerId) })
})

export const POST = withErrorHandling(async (req: Request) => {
  let body: {
    answerId?: string
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

  const { answerId, huntId, clueId, playerWallet, submittedAnswer, rejectedReason } = body

  if (!answerId || typeof answerId !== "string" || answerId.trim().length === 0) {
    throw new ValidationError("answerId is required", { field: "answerId" })
  }
  if (!huntId || typeof huntId !== "number") {
    throw new ValidationError("huntId is required", { field: "huntId" })
  }
  if (!clueId || typeof clueId !== "number") {
    throw new ValidationError("clueId is required", { field: "clueId" })
  }
  if (!playerWallet || typeof playerWallet !== "string" || playerWallet.trim().length === 0) {
    throw new ValidationError("playerWallet is required", { field: "playerWallet" })
  }
  if (!submittedAnswer || typeof submittedAnswer !== "string" || submittedAnswer.trim().length === 0) {
    throw new ValidationError("submittedAnswer is required", { field: "submittedAnswer" })
  }

  const dispute = createAnswerDispute({
    answerId,
    huntId,
    clueId,
    playerWallet,
    submittedAnswer: submittedAnswer.trim(),
    rejectedReason,
  })

  return NextResponse.json({ dispute }, { status: 201 })
})
