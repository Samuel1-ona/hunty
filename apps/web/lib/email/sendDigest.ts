/**
 * Email digest sending service using Resend.
 *
 * Handles digest composition, sending, and tracking.
 */

import React from "react"
import { Resend } from "resend"
import { logger } from "@/lib/logger"
import { EmailDigest } from "@/components/emails/EmailDigest"
import type { EmailDigestContent } from "./types"
import type { PlayerEmailPreference } from "./types"
import {
  recordDigestSend,
  getLastDigestSend,
  createUnsubscribeToken,
} from "./dbStore"
import { generateDigestContent } from "./digestService"

const resendApiKey = process.env.RESEND_API_KEY

/**
 * Sends a digest email to a player.
 *
 * Returns true if sent successfully, false otherwise.
 */
export async function sendDigestToPlayer(
  player: PlayerEmailPreference,
  forceSimulate: boolean = false,
): Promise<boolean> {
  if (!resendApiKey) {
    logger.warn("RESEND_API_KEY not set; cannot send digest emails")
    return false
  }

  try {
    // Create an unsubscribe token
    const unsubscribeToken = await createUnsubscribeToken(player.id)

    // Generate digest content
    const digestContent = await generateDigestContent(
      player.email,
      player.walletAddress,
      unsubscribeToken.token,
    )

    // No hunts to send
    if (!digestContent) {
      logger.info(`No new hunts for player ${player.walletAddress}; skipping digest`)
      return false
    }

    // In development/test, just log
    if (forceSimulate || process.env.NODE_ENV === "development") {
      logger.info(`[SIMULATED] Would send digest to ${player.email}`, {
        huntCount: digestContent.newHunts.length,
        categories: digestContent.newHunts.map((h) => h.category),
      })

      // Still record it if we had content
      await recordDigestSend(
        player.id,
        player.email,
        digestContent.newHunts.map((h) => h.id),
        digestContent.newHunts.map((h) => h.category),
        true,
      )

      return true
    }

    // Send via Resend
    const resend = new Resend(resendApiKey)

    const emailResponse = await resend.emails.send({
      from: "Hunty <digest@hunty.app>",
      to: [player.email],
      subject: `${digestContent.newHunts.length} new hunt${digestContent.newHunts.length !== 1 ? "s" : ""} waiting for you on Hunty 🎯`,
      react: React.createElement(EmailDigest, { content: digestContent }),
    })

    if (!emailResponse.data) {
      throw new Error(emailResponse.error?.message || "Unknown Resend error")
    }

    // Record successful send
    await recordDigestSend(
      player.id,
      player.email,
      digestContent.newHunts.map((h) => h.id),
      digestContent.newHunts.map((h) => h.category),
      true,
    )

    logger.info(`Digest sent successfully to ${player.email}`, {
      messageId: emailResponse.data.id,
      huntCount: digestContent.newHunts.length,
    })

    return true
  } catch (err) {
    logger.error(`Failed to send digest to ${player.email}:`, err)

    // Try to record the failure
    try {
      await recordDigestSend(
        player.id,
        player.email,
        [],
        [],
        false,
        err instanceof Error ? err.message : "Unknown error",
      )
    } catch (recordErr) {
      logger.error("Failed to record digest send failure:", recordErr)
    }

    return false
  }
}

/**
 * Sends digests to all subscribed players that haven't received one recently.
 *
 * Only sends to players who:
 * 1. Have digest_subscribed = true
 * 2. Haven't received a digest in the last N hours (default: 24)
 *
 * Returns { sent: number, skipped: number, failed: number }
 */
export async function sendDigestBatch(
  options: {
    minHoursSinceLast?: number
    dryRun?: boolean
  } = {},
): Promise<{ sent: number; skipped: number; failed: number }> {
  const { minHoursSinceLast = 24, dryRun = false } = options

  try {
    const { getAllSubscribedPlayers } = await import("./dbStore")
    const subscribedPlayers = await getAllSubscribedPlayers()

    let sent = 0
    let skipped = 0
    let failed = 0

    for (const player of subscribedPlayers) {
      // Check if enough time has passed since last send
      const lastSend = await getLastDigestSend(player.id)
      if (lastSend) {
        const hoursSinceLast = (Date.now() - lastSend.sentAt) / (1000 * 60 * 60)
        if (hoursSinceLast < minHoursSinceLast) {
          skipped++
          continue
        }
      }

      // Send digest
      const sendResult = await sendDigestToPlayer(player, dryRun)
      if (sendResult) {
        sent++
      } else {
        failed++
      }
    }

    logger.info("Digest batch complete", { sent, skipped, failed })
    return { sent, skipped, failed }
  } catch (err) {
    logger.error("Failed to send digest batch:", err)
    throw err
  }
}
