import { createHmac, randomUUID } from "node:crypto"

import { getDb } from "@/lib/db"
import { logger } from "@/lib/logger"

export type WebhookEventType = "hunt.published" | "hunt.joined" | "hunt.completed"
export type WebhookPayload = {
  id: string
  type: WebhookEventType
  createdAt: string
  data: Record<string, unknown>
}

const MAX_ATTEMPTS = 3
const RETRY_DELAYS_MS = [0, 1_000, 5_000]

export function signWebhookPayload(secret: string, timestamp: number, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")
}

export function getWebhookSignature(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)): string {
  return `t=${timestamp},v1=${signWebhookPayload(secret, timestamp, body)}`
}

type WebhookRow = { id: string; url: string; secret: string; events: WebhookEventType[] }

export async function emitWebhookEvent(type: WebhookEventType, data: Record<string, unknown>): Promise<void> {
  const sql = getDb()
  const payload: WebhookPayload = { id: randomUUID(), type, createdAt: new Date().toISOString(), data }
  const creatorAddress = typeof data.creatorAddress === "string" ? data.creatorAddress : null
  const rows = await sql<WebhookRow[]>`
    SELECT id, url, secret, events FROM webhooks
    WHERE active = TRUE AND ${type} = ANY(events)
      AND (${creatorAddress}::text IS NULL OR creator_address = ${creatorAddress})
  `

  await Promise.all(rows.map(async (webhook) => {
    const [delivery] = await sql<{ id: string }[]>`
      INSERT INTO webhook_deliveries (webhook_id, event_id, event_type, payload)
      VALUES (${webhook.id}, ${payload.id}, ${payload.type}, ${sql.json(payload)})
      RETURNING id
    `
    await deliverWebhook(sql, webhook, delivery.id, payload)
  }))
}

async function deliverWebhook(sql: ReturnType<typeof getDb>, webhook: WebhookRow, deliveryId: string, payload: WebhookPayload): Promise<void> {
  const body = JSON.stringify(payload)
  const timestamp = Math.floor(Date.now() / 1000)
  let lastError = "Delivery failed"

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (RETRY_DELAYS_MS[attempt - 1] > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1]))
    }
    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "Hunty-Webhooks/1.0", "x-hunty-signature": getWebhookSignature(webhook.secret, body, timestamp) },
        body,
        signal: AbortSignal.timeout(10_000),
      })
      if (response.ok) {
        await sql`UPDATE webhook_deliveries SET status = 'delivered', attempts = ${attempt}, response_status = ${response.status}, delivered_at = NOW(), next_attempt_at = NULL WHERE id = ${deliveryId}`
        return
      }
      lastError = `Endpoint returned HTTP ${response.status}`
      await sql`UPDATE webhook_deliveries SET attempts = ${attempt}, response_status = ${response.status}, last_error = ${lastError} WHERE id = ${deliveryId}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Delivery failed"
      await sql`UPDATE webhook_deliveries SET attempts = ${attempt}, last_error = ${lastError} WHERE id = ${deliveryId}`
    }
  }

  await sql`UPDATE webhook_deliveries SET status = 'failed', last_error = ${lastError}, next_attempt_at = NULL WHERE id = ${deliveryId}`
  logger.error("Webhook delivery failed", { webhookId: webhook.id, deliveryId, error: lastError })
}