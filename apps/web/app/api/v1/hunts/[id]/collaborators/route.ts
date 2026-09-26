import { NextResponse } from "next/server"
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit"
import { ValidationError } from "@/lib/api/errors"
import { withValidation } from "@/lib/api/withValidation"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import {
  acceptInvite,
  ensureOwner,
  getActivityLog,
  getCollaborators,
  inviteCollaborator,
  removeCollaborator,
  transferOwnership,
  updateCollaboratorRole,
} from "@/lib/collaboration"
import {
  dbAcceptInvite,
  dbEnsureOwner,
  dbGetActiveEditors,
  dbGetCollaborators,
  dbGetRoleForWallet,
  dbInviteCollaborator,
  dbPingPresence,
  dbRemoveCollaborator,
  dbSaveCollaborators,
  dbTransferOwnership,
  dbUpdateCollaboratorRole,
} from "@/lib/collaborationDb"
import { collaboratorsBodySchema } from "@hunty/types/api-schemas"
import { z } from "zod"

type RouteContext = { params: Promise<{ id: string }> }

const paramsSchema = z.object({ id: z.string() })

function parseHuntId(id: string): number | null {
  const n = Number(id)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * GET /api/v1/hunts/:id/collaborators
 * List collaborators + recent activity for a hunt.
 */
export const GET = withErrorHandling(async (req: Request, context: RouteContext) => {
  const ip = getIP(req)
  const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60_000 })
  if (!success) return rateLimitResponse(reset)

  const { id } = await context.params
  const huntId = parseHuntId(id)
  if (huntId == null) {
    throw new ValidationError("Invalid hunt id", { id })
  }

  const collaborators = await dbGetCollaborators(huntId)
  return NextResponse.json({
    collaborators,
    activity: getActivityLog(huntId, 50),
  })
})

/**
 * POST /api/v1/hunts/:id/collaborators
 * Actions: invite | accept | update_role | remove | transfer | ensure_owner
 */
export const POST = withValidation(
  { body: collaboratorsBodySchema, params: paramsSchema },
  async (req, _context, { body, params }) => {
    const ip = getIP(req)
    const { success, reset } = await rateLimit(ip, { limit: 40, windowMs: 60_000 })
    if (!success) return rateLimitResponse(reset)

    const huntId = parseHuntId(params!.id)
    if (huntId == null) {
      throw new ValidationError("Invalid hunt id", { id: params!.id })
    }

    switch (body.action) {
      case "ensure_owner": {
        const owner = await dbEnsureOwner(huntId, body.actorAddress)
        await dbSaveCollaborators(huntId, [owner, ...(await dbGetCollaborators(huntId)).filter((c) => c.walletAddress !== body.actorAddress)])
        return NextResponse.json({ ok: true, collaborator: owner })
      }
      case "invite": {
        const role = body.role === "viewer" ? "viewer" : "editor"
        const result = await dbInviteCollaborator(huntId, body.actorAddress, body.walletAddress, role)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        return NextResponse.json({ ok: true, collaborator: result.collaborator })
      }
      case "accept": {
        const ok = await dbAcceptInvite(huntId, body.actorAddress)
        if (!ok) return NextResponse.json({ error: "Invite not found" }, { status: 404 })
        return NextResponse.json({ ok: true })
      }
      case "update_role": {
        const result = await dbUpdateCollaboratorRole(huntId, body.actorAddress, body.walletAddress, body.role)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        return NextResponse.json({ ok: true, collaborator: result.collaborator })
      }
      case "remove": {
        const result = await dbRemoveCollaborator(huntId, body.actorAddress, body.walletAddress)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        return NextResponse.json({ ok: true })
      }
      case "transfer": {
        const result = await dbTransferOwnership(huntId, body.actorAddress, body.newOwnerAddress)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        return NextResponse.json({ ok: true })
      }
    }
  }
)
