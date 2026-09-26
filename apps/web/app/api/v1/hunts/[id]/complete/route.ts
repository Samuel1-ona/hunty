import { NextResponse } from "next/server"
import { readCompletions, writeCompletions } from "@/lib/reviews"
import { withValidation } from "@/lib/api/withValidation"
import { ValidationError } from "@/lib/api/errors"
import { huntCompleteBodySchema } from "@hunty/types/api-schemas"
import { getActiveSeason } from "@/lib/seasonStore"
import { awardXp, XP_PER_HUNT } from "@/lib/battlePassStore"
import { verifyCallerAuth } from "@/lib/walletAuth"
import { z } from "zod"

const paramsSchema = z.object({ id: z.string() })

/**
 * POST /api/v1/hunts/[id]/complete
 * Register that a player address has completed a hunt.
 * Also awards battle pass XP for the active season.
 */
export const POST = withValidation(
  { body: huntCompleteBodySchema, params: paramsSchema },
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
    if (actor !== body.playerAddress) {
      return NextResponse.json({ error: "Forbidden: completion can only be submitted for the verified player" }, { status: 403 })
    }

    const huntId = parseInt(params!.id, 10)
    if (isNaN(huntId)) {
      throw new ValidationError("Invalid hunt ID", { id: params!.id })
    }

    const completions = await readCompletions()
    if (!completions[huntId]) {
      completions[huntId] = {}
    }
    completions[huntId][body.playerAddress] = true

    await writeCompletions(completions)

    // Award battle pass XP for active season
    const activeSeason = getActiveSeason()
    let battlePass = null
    if (activeSeason) {
      battlePass = awardXp(activeSeason.id, body.playerAddress, XP_PER_HUNT)
    }

    return NextResponse.json({ success: true, battlePass })
  }
)
