import { randomBytes, randomUUID } from "node:crypto"

import { NextResponse } from "next/server"
import { AuthError, ForbiddenError, ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { withValidation } from "@/lib/api/withValidation"
import { getDb } from "@/lib/db"
import { verifyCallerAuth } from "@/lib/walletAuth"
import { webhookCreateBodySchema, webhookQuerySchema } from "@hunty/types/api-schemas"

function actorFromAuth(auth: Awaited<ReturnType<typeof verifyCallerAuth>>): string {
  if (!auth.authenticated) throw new AuthError(auth.error ?? "Authentication required")
  if (!auth.authorized) throw new ForbiddenError(auth.error ?? "Forbidden")
  if (!auth.actor) throw new AuthError("Authenticated caller has no actor")
  return auth.actor
}

export const GET = withErrorHandling(async (req: Request) => {
  const result = webhookQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams.entries()))
  if (!result.success) throw new ValidationError("A valid creatorAddress query parameter is required")
  const actor = actorFromAuth(await verifyCallerAuth(req as import("next/server").NextRequest))
  if (result.data.creatorAddress !== actor) throw new AuthError("Cannot access another creator's webhooks")
  const sql = getDb()
  const webhooks = await sql`
    SELECT id, url, events, active, created_at, updated_at
    FROM webhooks WHERE creator_address = ${result.data.creatorAddress}
    ORDER BY created_at DESC
  `
  const deliveries = await sql`
    SELECT d.id, d.webhook_id, d.event_id, d.event_type, d.status, d.attempts,
           d.response_status, d.last_error, d.created_at, d.delivered_at
    FROM webhook_deliveries d JOIN webhooks w ON w.id = d.webhook_id
    WHERE w.creator_address = ${result.data.creatorAddress}
    ORDER BY d.created_at DESC LIMIT 100
  `
  return NextResponse.json({ webhooks, deliveries })
})

export const POST = withValidation(
  { body: webhookCreateBodySchema },
  async (req, _context, { body }) => {
    const owner = actorFromAuth(await verifyCallerAuth(req as import("next/server").NextRequest, body))
    const id = randomUUID()
    const secret = `whsec_${randomBytes(32).toString("hex")}`
    const sql = getDb()
    await sql`
      INSERT INTO webhooks (id, creator_address, url, secret, events)
      VALUES (${id}, ${owner}, ${body.url}, ${secret}, ${sql.array(body.events)})
    `
    return NextResponse.json({ data: { id, url: body.url, events: body.events, active: true, secret } }, { status: 201 })
  },
)
