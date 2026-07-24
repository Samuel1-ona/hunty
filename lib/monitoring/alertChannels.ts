import { MONITORING } from "./config"
import type { AlertEvent, AlertChannel } from "./types"
import { logger } from "@/lib/logger"

const sentAlerts = new Set<string>()
const alertCooldownMs = MONITORING.alerts.cooldownMinutes * 60 * 1000

function isDuplicate(event: AlertEvent): boolean {
  const key = `${event.level}-${event.title}`
  if (sentAlerts.has(key)) return true
  sentAlerts.add(key)
  setTimeout(() => sentAlerts.delete(key), alertCooldownMs)
  return false
}

async function sendEmail(event: AlertEvent): Promise<boolean> {
  if (!MONITORING.alerts.channels.email.enabled) return false
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: MONITORING.alerts.channels.email.from,
        to: MONITORING.alerts.channels.email.to,
        subject: `[${event.level.toUpperCase()}] ${event.title}`,
        text: `${event.message}\n\nSource: ${event.source}\nTime: ${event.timestamp}${event.metadata ? `\nMetadata: ${JSON.stringify(event.metadata, null, 2)}` : ""}`,
      }),
    })
    return response.ok
  } catch (error) {
    logger.error("[Alerts] Email send failed:", error)
    return false
  }
}

async function sendSlack(event: AlertEvent): Promise<boolean> {
  if (!MONITORING.alerts.channels.slack.enabled) return false
  try {
    const color = event.level === "critical" ? "#ff0000" : event.level === "warning" ? "#ffa500" : "#3498db"
    const response = await fetch(MONITORING.alerts.channels.slack.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attachments: [
          {
            color,
            title: event.title,
            text: event.message,
            fields: [
              { title: "Source", value: event.source, short: true },
              { title: "Level", value: event.level, short: true },
              { title: "Time", value: event.timestamp, short: false },
            ],
            footer: "Hunty Monitoring",
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }),
    })
    return response.ok
  } catch (error) {
    logger.error("[Alerts] Slack send failed:", error)
    return false
  }
}

async function sendDiscord(event: AlertEvent): Promise<boolean> {
  if (!MONITORING.alerts.channels.discord.enabled) return false
  try {
    const color =
      event.level === "critical" ? 0xff0000 : event.level === "warning" ? 0xffa500 : 0x3498db
    const response = await fetch(MONITORING.alerts.channels.discord.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: event.title,
            description: event.message,
            color,
            fields: [
              { name: "Source", value: event.source, inline: true },
              { name: "Level", value: event.level, inline: true },
              { name: "Time", value: event.timestamp, inline: false },
            ],
            footer: { text: "Hunty Monitoring" },
            timestamp: event.timestamp,
          },
        ],
      }),
    })
    return response.ok
  } catch (error) {
    logger.error("[Alerts] Discord send failed:", error)
    return false
  }
}

const channelDispatchers: Record<AlertChannel, (event: AlertEvent) => Promise<boolean>> = {
  email: sendEmail,
  slack: sendSlack,
  discord: sendDiscord,
}

export async function dispatchAlert(
  event: AlertEvent,
  channels?: AlertChannel[],
): Promise<void> {
  if (isDuplicate(event)) {
    logger.debug(`[Alerts] Skipping duplicate: ${event.title}`)
    return
  }

  logger.info(`[Alerts] Dispatching: [${event.level}] ${event.title}`)

  const targets = channels ?? (["email", "slack", "discord"] as AlertChannel[])

  const results = await Promise.allSettled(
    targets.map((channel) => channelDispatchers[channel](event)),
  )

  const failures = results.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected",
  )
  if (failures.length > 0) {
    logger.error(`[Alerts] ${failures.length} channel(s) failed to deliver alert`)
  }
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export async function sendTestAlert(): Promise<string> {
  const event: AlertEvent = {
    id: generateId(),
    level: "info",
    title: "Test Alert from Hunty Monitoring",
    message: "This is a test alert to verify all alert channels are configured correctly.",
    source: "monitoring-system",
    timestamp: new Date().toISOString(),
    metadata: { test: true, version: process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0" },
  }

  await dispatchAlert(event)
  return event.id
}
