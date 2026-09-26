import { NextResponse } from "next/server"

import { ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { withValidation } from "@/lib/api/withValidation"
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { verifyCallerAuth } from "@/lib/walletAuth"
import {
  getPlayerProgress,
  savePlayerProgress,
} from "@/lib/progressData"
import { huntProgressBodySchema, huntProgressQuerySchema } from "@hunty/types/api-schemas"
import { z } from "zod"

type RouteContext = { params: Promise<{ id: string }> }

const paramsSchema = z.object({ id: z.string() })

export const GET = withErrorHandling(async (req: Request, context: RouteContext) => {
  const ip = getIP(req)
  const { success, reset } = await rateLimit(ip, {
    limit: 100,
    windowMs: 60 * 1000,
  })
  if (!success) {
    return rateLimitResponse(reset)
  }

  const { id } = await context.params
  const huntId = parseInt(id, 10)
  if (isNaN(huntId)) {
    throw new ValidationError("Invalid hunt ID", { id })
  }

  const { searchParams } = new URL(req.url)
  const queryResult = huntProgressQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))
  if (!queryResult.success) {
    throw new ValidationError("Invalid query parameters", {
      fieldErrors: queryResult.error.flatten().fieldErrors,
    })
  }

  const progress = getPlayerProgress(huntId, queryResult.data.wallet)
  if (!progress) {
    return NextResponse.json({ data: null })
  }

  return NextResponse.json({ data: progress })
})

export const POST = withValidation(
  { body: huntProgressBodySchema, params: paramsSchema },
  async (req, _context, { body, params }) => {
    const auth = await verifyCallerAuth(req, body)
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error || "Unauthenticated" }, { status: auth.status || 401 })
    }
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 403 })
    }
    const actor = auth.actor
    if (!actor) {
      return NextResponse.json({ error: "Authenticated actor is missing" }, { status: 401 })
    }
    if (actor !== body.wallet) {
      return NextResponse.json({ error: "Forbidden: progress can only be updated for the verified player" }, { status: 403 })
    }

    const ip = getIP(req)
    const { success, reset } = await rateLimit(ip, {
      limit: 60,
      windowMs: 60 * 1000,
    })
    if (!success) {
      return rateLimitResponse(reset)
    }

    const huntId = parseInt(params!.id, 10)
    if (isNaN(huntId)) {
      throw new ValidationError("Invalid hunt ID", { id: params!.id })
    }

    const entry = savePlayerProgress(
      huntId,
      body.wallet,
      body.currentClueIndex,
      body.totalClues,
      body.totalPoints,
      body.completedClueIds,
      body.completed,
    )

    return NextResponse.json({ data: entry })
  }
)
