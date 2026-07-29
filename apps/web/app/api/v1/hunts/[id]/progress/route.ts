import { NextResponse } from "next/server"

import { NotFoundError, ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import {
  getPlayerProgress,
  savePlayerProgress,
} from "@/lib/progressData"

export const GET = withErrorHandling<{
  params: Promise<{ id: string }>
}>(async (req, { params }) => {
  const ip = getIP(req)
  const { success, reset } = await rateLimit(ip, {
    limit: 100,
    windowMs: 60 * 1000,
  })
  if (!success) {
    return rateLimitResponse(reset)
  }

  const { id } = await params
  const huntId = parseInt(id, 10)
  if (isNaN(huntId)) {
    throw new ValidationError("Invalid hunt ID", { id })
  }

  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get("wallet")
  if (!wallet) {
    throw new ValidationError("wallet query parameter is required")
  }

  const progress = getPlayerProgress(huntId, wallet)
  if (!progress) {
    return NextResponse.json({ data: null })
  }

  return NextResponse.json({ data: progress })
})

export const POST = withErrorHandling<{
  params: Promise<{ id: string }>
}>(async (req, { params }) => {
  const ip = getIP(req)
  const { success, reset } = await rateLimit(ip, {
    limit: 60,
    windowMs: 60 * 1000,
  })
  if (!success) {
    return rateLimitResponse(reset)
  }

  const { id } = await params
  const huntId = parseInt(id, 10)
  if (isNaN(huntId)) {
    throw new ValidationError("Invalid hunt ID", { id })
  }

  let body: {
    wallet?: string
    currentClueIndex?: number
    totalClues?: number
    totalPoints?: number
    completedClueIds?: number[]
    completed?: boolean
  }
  try {
    body = await req.json()
  } catch {
    throw new ValidationError("Invalid request body")
  }

  if (!body.wallet || typeof body.wallet !== "string") {
    throw new ValidationError("wallet is required")
  }
  if (
    body.currentClueIndex === undefined ||
    typeof body.currentClueIndex !== "number"
  ) {
    throw new ValidationError("currentClueIndex is required")
  }
  if (body.totalClues === undefined || typeof body.totalClues !== "number") {
    throw new ValidationError("totalClues is required")
  }

  const entry = savePlayerProgress(
    huntId,
    body.wallet,
    body.currentClueIndex,
    body.totalClues,
    body.totalPoints ?? 0,
    body.completedClueIds ?? [],
    body.completed ?? false,
  )

  return NextResponse.json({ data: entry })
})
