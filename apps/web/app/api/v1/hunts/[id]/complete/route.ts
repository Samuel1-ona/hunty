import { NextResponse } from "next/server"
import { readCompletions, writeCompletions } from "@/lib/reviews"
import { withValidation } from "@/lib/api/withValidation"
import { ValidationError } from "@/lib/api/errors"
import { huntCompleteBodySchema } from "@hunty/types/api-schemas"
import { emitWebhookEvent } from "@/lib/webhooks"
import { z } from "zod"

const paramsSchema = z.object({ id: z.string() })

/**
 * POST /api/v1/hunts/[id]/complete
 * Register that a player address has completed a hunt.
 */
export const POST = withValidation(
  { body: huntCompleteBodySchema, params: paramsSchema },
  async (_req, _context, { body, params }) => {
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

    const { getHuntById } = await import("@/lib/huntStore")
    const hunt = getHuntById(huntId)
    if (hunt?.creator || hunt?.ownerAddress) {
      await emitWebhookEvent("hunt.completed", {
        huntId,
        playerAddress: body.playerAddress,
        creatorAddress: hunt.creator ?? hunt.ownerAddress,
      }).catch(() => undefined)
    }

    return NextResponse.json({ success: true })
  }
)
