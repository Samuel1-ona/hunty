import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { withValidation } from "@/lib/api/withValidation"
import { getDb } from "@/lib/db"
import { verifyCallerAuth } from "@/lib/walletAuth"
import { webhookUpdateBodySchema } from "@hunty/types/api-schemas"
import { z } from "zod"

const paramsSchema = z.object({ id: z.string().uuid() })

export const PATCH = withValidation(
  { body: webhookUpdateBodySchema, params: paramsSchema },
  async (req, _context, { body, params }) => {
    const auth = await verifyCallerAuth(req as unknown as NextRequest, body as Record<string, unknown>)
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error || "Unauthenticated" }, { status: auth.status || 401 })
    }
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 403 })
    }

    // The owner key comes from the verified identity, never from a header.
    const creatorAddress = auth.actor!
    const sql = getDb()
    const [webhook] = await sql`
      UPDATE webhooks SET
        url = COALESCE(${body.url ?? null}, url),
        events = COALESCE(${body.events ? sql.array(body.events) : null}, events),
        active = COALESCE(${body.active ?? null}, active), updated_at = NOW()
      WHERE id = ${params!.id} AND creator_address = ${creatorAddress}
      RETURNING id, url, events, active, updated_at
    `
    if (!webhook) return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    return NextResponse.json({ data: webhook })
  },
)

export const DELETE = withErrorHandling(async (req: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params
  if (!z.string().uuid().safeParse(id).success) throw new ValidationError("Invalid webhook ID")

  const auth = await verifyCallerAuth(req as unknown as NextRequest)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error || "Unauthenticated" }, { status: auth.status || 401 })
  }
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 403 })
  }

  const sql = getDb()
  const result = await sql`
    DELETE FROM webhooks
    WHERE id = ${id} AND creator_address = ${auth.actor!}
  `
  if (result.count === 0) return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
  return NextResponse.json({ success: true })
})
