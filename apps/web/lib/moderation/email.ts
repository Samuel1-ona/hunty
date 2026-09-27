import { Resend } from "resend"
import React from "react"
import { logger } from "@/lib/logger"
import { HuntModerationEmail } from "@/components/emails/HuntModerationEmail"

export async function sendModerationActionEmail(input: {
  huntName: string
  creatorEmail: string
  action: "approved" | "rejected"
  reason?: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    logger.warn("RESEND_API_KEY not set; skipping moderation email")
    return
  }

  const resend = new Resend(apiKey)
  const subject =
    input.action === "approved"
      ? `Your hunt "${input.huntName}" was approved`
      : `Your hunt "${input.huntName}" needs changes`

  try {
    await resend.emails.send({
      from: "Hunty <onboarding@resend.dev>",
      to: [input.creatorEmail],
      subject,
      react: React.createElement(HuntModerationEmail, {
        huntName: input.huntName,
        action: input.action,
        reason: input.reason,
      }),
    })
  } catch (err) {
    logger.error("Failed to send moderation email:", err)
  }
}
