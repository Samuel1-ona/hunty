import { NextResponse } from "next/server"

import { AuthError, ForbiddenError, ValidationError } from "@/lib/api/errors"
import { withValidation } from "@/lib/api/withValidation"
import { emitWebhookEvent } from "@/lib/webhooks"
import { verifyCallerAuth } from "@/lib/walletAuth"
import { webhookEmitBodySchema } from "@hunty/types/api-schemas"

export const POST = withValidation(
  { body: webhookEmitBodySchema },
  async (req, _context, { body }) => {
    const auth = await verifyCallerAuth(req as import("next/server").NextRequest, body)
    if (!auth.authenticated) throw new AuthError(auth.error ?? "Authentication required")
    if (!auth.authorized) throw new ForbiddenError(auth.error ?? "Forbidden")
    if (!auth.actor) throw new AuthError("Authenticated caller has no actor")
    if (auth.actor !== body.creatorAddress) {
      throw new ValidationError("Authenticated caller does not own creatorAddress")
    }
    await emitWebhookEvent(body.type, { ...body.data, creatorAddress: auth.actor })
    return NextResponse.json({ success: true }, { status: 202 })
  },
)
