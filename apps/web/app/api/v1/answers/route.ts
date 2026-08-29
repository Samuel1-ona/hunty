import { NextResponse } from "next/server"
import { z } from "zod"

import {
  calculateScore,
  checkMinInterval,
  detectAnomalies,
  getConfig,
  isBanned,
  recordAnswer,
  trackClueSubmission,
  verifyAnswer,
} from "@/lib/antiCheatDb"
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getServerClue } from "@/lib/server/seedClues"
import { ForbiddenError, NotFoundError, RateLimitError, ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { withAuth } from "@/lib/api/withAuth"
import { recordHintUsage } from "@/lib/analytics"

const answerSchema = z.object({
  huntId: z.number().int().positive(),
  clueId: z.number().int().positive(),
  wallet: z.string().min(56).max(56),
  answer: z.string().min(1).max(200).trim(),
  hintsUsed: z.number().int().min(0).max(3).optional().default(0),
  clientTimestamp: z.number().optional(),
})

export const POST = withErrorHandling(withAuth(async (req: Request) => {
  const ip = getIP(req)

  const config = await getConfig()
  const { success: ipSuccess, reset: ipReset } = await rateLimit(ip, {
    limit: config.maxSubmissionsPerWindow,
    windowMs: config.submissionWindowMs,
  })
  if (!ipSuccess) {
    return rateLimitResponse(ipReset)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    throw new ValidationError("Invalid request body")
  }

  const parsed = answerSchema.safeParse(body)
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path?.[0]
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Validation failed", { field })
  }

  const { huntId, clueId, answer, wallet, clientTimestamp, hintsUsed: validatedHintsUsed } = parsed.data

  if (await isBanned(wallet, ip)) {
    throw new ForbiddenError("Account is banned due to suspicious activity")
  }

  const clue = getServerClue(huntId, clueId)
  if (!clue) {
    throw new NotFoundError("Clue not found", { huntId, clueId })
  }

  const { allowed: intervalAllowed, waitMs } = await checkMinInterval(wallet, huntId, clueId)
  if (!intervalAllowed) {
    throw new RateLimitError(`Please wait ${Math.ceil(waitMs / 1000)} seconds before submitting again`, {
      waitMs,
    })
  }

  await trackClueSubmission(wallet, huntId, clueId)

  const correct = await verifyAnswer(huntId, clueId, answer)

  const anomalyFlags = await detectAnomalies(wallet, ip, huntId, clueId, correct)

  const { score, bonusPoints } = await calculateScore(huntId, clueId, correct)

  await recordAnswer(
    huntId,
    clueId,
    wallet,
    ip,
    answer,
    correct,
    clientTimestamp ?? null,
    score,
    bonusPoints,
    anomalyFlags,
  )

  // Record each hint reveal in the analytics store (non-blocking, fire-and-forget)
  if (correct && validatedHintsUsed > 0) {
    for (let i = 0; i < validatedHintsUsed; i++) {
      recordHintUsage(huntId, clueId, i, wallet).catch(() => {
        // Analytics errors must never break the answer response
      })
    }
  }

  if (!correct) {
    return NextResponse.json(
      { correct: false, score: 0, bonusPoints: 0, flags: anomalyFlags },
      { status: 200 },
    )
  }

  return NextResponse.json({
    correct: true,
    score,
    bonusPoints,
    txHash: `mock_tx_${Date.now()}`,
    event: "ClueCompleted",
    serverTimestamp: Date.now(),
    flags: anomalyFlags,
    hintsUsed: validatedHintsUsed,
  })
}))
