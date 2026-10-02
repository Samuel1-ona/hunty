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
import { verifyCallerAuth } from "@/lib/walletAuth"
import { collaboratorsBodySchema } from "@hunty/types/api-schemas"
import { z } from "zod"

type RouteContext = { params: Promise<{ id: string }> }

const paramsSchema = z.object({ id: z.string() })

function parseHuntId(id: string): number | null {
  const n = Number(id)
  return Number.isFinite(n) && n > 0 ? n : null
}

async function isOwnerActor(huntId: number, actorAddress: string): Promise<boolean> {
  const role = await dbGetRoleForWallet(huntId, actorAddress)
  if (role === "owner") return true

  const { getHuntById } = await import("@/lib/huntStore")
  const hunt = getHuntById(huntId)
  return hunt?.ownerAddress === actorAddress || hunt?.creator === actorAddress
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
    const auth = await verifyCallerAuth(req, body)
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error || "Unauthenticated" }, { status: auth.status || 401 })
    }
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 403 })
    }
    const actorAddress = auth.actor
    if (!actorAddress) {
      return NextResponse.json({ error: "Authenticated actor is missing" }, { status: 401 })
    }

    const ip = getIP(req)
    const { success, reset } = await rateLimit(ip, { limit: 40, windowMs: 60_000 })
    if (!success) return rateLimitResponse(reset)

    const huntId = parseHuntId(params!.id)
    if (huntId == null) {
      throw new ValidationError("Invalid hunt id", { id: params!.id })
    }

    switch (body.action) {
      case "ensure_owner": {
        const owner = await dbEnsureOwner(huntId, actorAddress)
        await dbSaveCollaborators(huntId, [owner, ...(await dbGetCollaborators(huntId)).filter((c) => c.walletAddress !== actorAddress)])
        return NextResponse.json({ ok: true, collaborator: owner })
      }
      case "invite": {
        const isOwner = await isOwnerActor(huntId, actorAddress)
        if (!isOwner) {
          return NextResponse.json({ error: "Only the owner can add collaborators" }, { status: 403 })
        }
        const role = body.role === "viewer" ? "viewer" : "editor"
        const result = await dbInviteCollaborator(huntId, actorAddress, body.walletAddress, role)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        return NextResponse.json({ ok: true, collaborator: result.collaborator })
      }
      case "accept": {
        const ok = await dbAcceptInvite(huntId, actorAddress)
        if (!ok) return NextResponse.json({ error: "Invite not found" }, { status: 404 })
        return NextResponse.json({ ok: true })
      }
      case "update_role": {
        const result = await dbUpdateCollaboratorRole(huntId, actorAddress, body.walletAddress, body.role)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        return NextResponse.json({ ok: true, collaborator: result.collaborator })
      }
      case "remove": {
        const isOwner = await isOwnerActor(huntId, actorAddress)
        if (!isOwner) {
          return NextResponse.json({ error: "Only the owner can remove collaborators" }, { status: 403 })
        }
        const result = await dbRemoveCollaborator(huntId, actorAddress, body.walletAddress)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        return NextResponse.json({ ok: true })
      }
      case "transfer": {
        const result = await dbTransferOwnership(huntId, actorAddress, body.newOwnerAddress)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        return NextResponse.json({ ok: true })
      }
    }
  }
)
