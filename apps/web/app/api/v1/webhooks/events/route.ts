import { NextResponse } from "next/server"

import { ValidationError } from "@/lib/api/errors"
import { withValidation } from "@/lib/api/withValidation"
import { emitWebhookEvent } from "@/lib/webhooks"
import { webhookEmitBodySchema } from "@hunty/types/api-schemas"

export const POST = withValidation(
  { body: webhookEmitBodySchema },
  async (req, _context, { body }) => {
    const wallet = req.headers.get("x-wallet-address")
    if (wallet !== body.creatorAddress && body.type !== "hunt.joined") {
      throw new ValidationError("Wallet does not match creatorAddress")
    }
    await emitWebhookEvent(body.type, { ...body.data, creatorAddress: body.creatorAddress })
    return NextResponse.json({ success: true }, { status: 202 })
  },
)