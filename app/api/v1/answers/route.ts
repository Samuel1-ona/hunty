import { NextResponse } from "next/server"
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit"
import {
  verifyAnswer,
  checkMinInterval,
  trackClueSubmission,
  detectAnomalies,
  recordAnswer,
  isBanned,
  calculateScore,
  getConfig,
} from "@/lib/anti-cheat"
import { getServerClue } from "@/lib/server/seedClues"

export async function POST(req: Request) {
  const ip = getIP(req)

  const { success: ipSuccess, reset: ipReset } = rateLimit(ip, {
    limit: getConfig().maxSubmissionsPerWindow,
    windowMs: getConfig().submissionWindowMs,
  })
  if (!ipSuccess) {
    return rateLimitResponse(ipReset)
  }

  let body: { huntId?: number; clueId?: number; answer?: string; wallet?: string; clientTimestamp?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { huntId, clueId, answer, wallet, clientTimestamp } = body

  if (!huntId || typeof huntId !== "number") {
    return NextResponse.json({ error: "huntId is required" }, { status: 400 })
  }
  if (!clueId || typeof clueId !== "number") {
    return NextResponse.json({ error: "clueId is required" }, { status: 400 })
  }
  if (!answer || typeof answer !== "string" || answer.trim().length === 0) {
    return NextResponse.json({ error: "answer is required" }, { status: 400 })
  }
  if (!wallet || typeof wallet !== "string" || wallet.trim().length === 0) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 })
  }

  if (isBanned(wallet, ip)) {
    return NextResponse.json({ error: "Account is banned due to suspicious activity" }, { status: 403 })
  }

  const clue = getServerClue(huntId, clueId)
  if (!clue) {
    return NextResponse.json({ error: "Clue not found" }, { status: 404 })
  }

  const { allowed: intervalAllowed, waitMs } = checkMinInterval(wallet, huntId, clueId)
  if (!intervalAllowed) {
    return NextResponse.json(
      { error: `Please wait ${Math.ceil(waitMs / 1000)} seconds before submitting again` },
      { status: 429 },
    )
  }

  trackClueSubmission(wallet, huntId, clueId)

  const correct = await verifyAnswer(huntId, clueId, answer.trim())

  const anomalyFlags = detectAnomalies(wallet, ip, huntId, clueId, correct)

  const { score, bonusPoints } = calculateScore(huntId, clueId, correct)

  recordAnswer(
    huntId,
    clueId,
    wallet,
    ip,
    answer.trim(),
    correct,
    clientTimestamp ?? null,
    score,
    bonusPoints,
    anomalyFlags,
  )

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
  })
}
