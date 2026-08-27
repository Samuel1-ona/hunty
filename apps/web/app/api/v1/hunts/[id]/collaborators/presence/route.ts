import { NextResponse } from "next/server"
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit"
import { ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { withValidation } from "@/lib/api/withValidation"
import {
  dbGetActiveEditors,
  dbGetCollaborators,
  dbPingPresence,
  dbGetRoleForWallet,
} from "@/lib/collaborationDb"
import { presencePingBodySchema, presenceQuerySchema } from "@hunty/types/api-schemas"
import { z } from "zod"

type RouteContext = { params: Promise<{ id: string }> }

const paramsSchema = z.object({ id: z.string() })

function parseHuntId(id: string): number | null {
  const n = Number(id)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * GET /api/v1/hunts/:id/collaborators/presence
 * Returns active editors for a hunt.
 */
export const GET = withValidation(
  { query: presenceQuerySchema, params: paramsSchema },
  async (_req, context, { query, params }) => {
    const huntId = parseHuntId(params!.id)
    if (huntId == null) {
      throw new ValidationError("Invalid hunt id", { id: params!.id })
    }

    const activeEditors = await dbGetActiveEditors(
      huntId,
      query.walletAddress,
      query.staleMs,
    )

    return NextResponse.json({ activeEditors })
  }
)

/**
 * POST /api/v1/hunts/:id/collaborators/presence
 * Ping presence with optional editing field.
 */
export const POST = withValidation(
  { body: presencePingBodySchema, params: paramsSchema },
  async (req, _context, { body, params }) => {
    const ip = getIP(req)
    const { success, reset } = await rateLimit(ip, { limit: 120, windowMs: 60_000 })
    if (!success) return rateLimitResponse(reset)

    const huntId = parseHuntId(params!.id)
    if (huntId == null) {
      throw new ValidationError("Invalid hunt id", { id: params!.id })
    }

    await dbPingPresence(huntId, body.walletAddress, body.editingField ?? undefined)

    const role = await dbGetRoleForWallet(huntId, body.walletAddress)
    return NextResponse.json({ ok: true, role })
  }
)
