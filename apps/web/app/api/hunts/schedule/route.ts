import { NextResponse } from "next/server"
import { getAllHuntsIncludingPrivate, updateHuntStatus } from "@/lib/huntStore"
import { applyHuntScheduleTransitions, getReminderCandidates } from "@/lib/huntScheduling"
import { logger } from "@/lib/logger"
import { sendHuntStartReminder } from "@/lib/notifications/huntScheduleNotifications"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { withAdminAuth } from "@/lib/api/withAuth"

/**
 * POST /api/hunts/schedule
 *
 * Cron-style operational endpoint: walks every hunt (including private
 * ones), transitions statuses per schedule, and emails start reminders.
 * There is no per-caller identity concept here at all — this is meant to
 * be triggered by a scheduler/ops job, not an end user — so it is gated
 * behind the admin secret rather than left open. See issue #865.
 */
export const POST = withErrorHandling(
  withAdminAuth(async () => {
    try {
      const hunts = getAllHuntsIncludingPrivate()
      const updated = applyHuntScheduleTransitions(hunts)

      for (const hunt of updated) {
        if (hunt.status === "active" || hunt.status === "ended") {
          updateHuntStatus(hunt.id, hunt.status)
        }
      }

      const reminderCandidates = getReminderCandidates(updated)
      const reminderResults = await Promise.all(
        reminderCandidates.map(async (hunt) => {
          const recipientEmail = hunt.creatorEmail
          if (!recipientEmail) return false
          return sendHuntStartReminder({
            hunt,
            recipientEmail,
            startTime: hunt.startAt ?? hunt.startTime ?? Math.floor(Date.now() / 1000),
          })
        })
      )

      return NextResponse.json({
        updated: updated.filter((hunt) => hunt.status === "active" || hunt.status === "ended" || hunt.status === "scheduled").length,
        reminders: reminderCandidates.map((hunt) => hunt.id),
        sent: reminderResults.filter(Boolean).length,
      })
    } catch (error) {
      logger.error("Failed to process hunt schedule", error)
      return NextResponse.json({ error: "Failed to process hunt schedule" }, { status: 500 })
    }
  })
)
