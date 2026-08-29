import { NextResponse } from "next/server"
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit"
import {
  acceptInvite,
  ensureOwner,
  getActivityLog,
  getCollaborators,
  inviteCollaborator,
  removeCollaborator,
  transferOwnership,
  updateCollaboratorRole,
  type CollaboratorRole,
} from "@/lib/collaboration"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { type AuthContext, withAuth } from "@/lib/api/withAuth"

type RouteContext = { params: Promise<{ id: string }> }

function parseHuntId(id: string): number | null {
  const n = Number(id)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * GET /api/v1/hunts/:id/collaborators
 * List collaborators + recent activity for a hunt.
 */
export async function GET(req: Request, context: RouteContext) {
  const ip = getIP(req)
  const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60_000 })
  if (!success) return rateLimitResponse(reset)

  const { id } = await context.params
  const huntId = parseHuntId(id)
  if (huntId == null) {
    return NextResponse.json({ error: "Invalid hunt id" }, { status: 400 })
  }

  return NextResponse.json({
    collaborators: getCollaborators(huntId),
    activity: getActivityLog(huntId, 50),
  })
}

/**
 * POST /api/v1/hunts/:id/collaborators
 * Actions: invite | accept | update_role | remove | transfer | ensure_owner
 *
 * The acting caller's identity now comes from `withAuth` (which already
 * recognizes `actorAddress` as an identity field) instead of being read
 * directly from the request body.
 */
export const POST = withErrorHandling(
  withAuth(async (req: Request, context: RouteContext, auth: AuthContext) => {
    const ip = getIP(req)
    const { success, reset } = await rateLimit(ip, { limit: 40, windowMs: 60_000 })
    if (!success) return rateLimitResponse(reset)

    const { id } = await context.params
    const huntId = parseHuntId(id)
    if (huntId == null) {
      return NextResponse.json({ error: "Invalid hunt id" }, { status: 400 })
    }

    let body: {
      action?: string
      walletAddress?: string
      role?: CollaboratorRole
      newOwnerAddress?: string
    }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const actor = auth.identity

    switch (body.action) {
      case "ensure_owner": {
        const owner = ensureOwner(huntId, actor)
        return NextResponse.json({ ok: true, collaborator: owner })
      }
      case "invite": {
        if (!body.walletAddress) {
          return NextResponse.json({ error: "walletAddress is required" }, { status: 400 })
        }
        const role = body.role === "viewer" ? "viewer" : "editor"
        const result = inviteCollaborator(huntId, actor, body.walletAddress, role)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        return NextResponse.json({ ok: true, collaborator: result.collaborator })
      }
      case "accept": {
        const ok = acceptInvite(huntId, actor)
        if (!ok) return NextResponse.json({ error: "Invite not found" }, { status: 404 })
        return NextResponse.json({ ok: true })
      }
      case "update_role": {
        if (!body.walletAddress || (body.role !== "editor" && body.role !== "viewer")) {
          return NextResponse.json({ error: "walletAddress and role required" }, { status: 400 })
        }
        const result = updateCollaboratorRole(huntId, actor, body.walletAddress, body.role)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        return NextResponse.json({ ok: true, collaborator: result.collaborator })
      }
      case "remove": {
        if (!body.walletAddress) {
          return NextResponse.json({ error: "walletAddress is required" }, { status: 400 })
        }
        const result = removeCollaborator(huntId, actor, body.walletAddress)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        return NextResponse.json({ ok: true })
      }
      case "transfer": {
        if (!body.newOwnerAddress) {
          return NextResponse.json({ error: "newOwnerAddress is required" }, { status: 400 })
        }
        const result = transferOwnership(huntId, actor, body.newOwnerAddress)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        return NextResponse.json({ ok: true })
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  })
)
