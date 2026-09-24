import { NextResponse } from "next/server"

import { ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { withValidation } from "@/lib/api/withValidation"
import { getDb } from "@/lib/db"
import { webhookUpdateBodySchema } from "@hunty/types/api-schemas"
import { z } from "zod"

const paramsSchema = z.object({ id: z.string().uuid() })

function owner(req: Request): string {
  const address = req.headers.get("x-wallet-address") ?? req.headers.get("x-creator-address")
  if (!address) throw new ValidationError("Creator wallet address is required")
  return address
}

export const PATCH = withValidation(
  { body: webhookUpdateBodySchema, params: paramsSchema },
  async (req, _context, { body, params }) => {
    const sql = getDb()
    const address = owner(req)
    const [webhook] = await sql`
      UPDATE webhooks SET
        url = COALESCE(${body.url ?? null}, url),
        events = COALESCE(${body.events ? sql.array(body.events) : null}, events),
        active = COALESCE(${body.active ?? null}, active), updated_at = NOW()
      WHERE id = ${params!.id} AND creator_address = ${address}
      RETURNING id, url, events, active, updated_at
    `
    if (!webhook) return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    return NextResponse.json({ data: webhook })
  },
)

export const DELETE = withErrorHandling(async (req: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params
  if (!z.string().uuid().safeParse(id).success) throw new ValidationError("Invalid webhook ID")
  const sql = getDb()
  const result = await sql`DELETE FROM webhooks WHERE id = ${id} AND creator_address = ${owner(req)}`
  if (result.count === 0) return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
  return NextResponse.json({ success: true })
})