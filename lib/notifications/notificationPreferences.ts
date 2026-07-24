import { logger } from "@/lib/logger"
import type { NotificationPreferences } from "./types"
import { DEFAULT_NOTIFICATION_PREFERENCES } from "./types"

const PREFS_KEY = "hunty_notification_prefs"

export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_NOTIFICATION_PREFERENCES }

  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES }
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) }
  } catch (error) {
    logger.error("Failed to load notification preferences:", error)
    return { ...DEFAULT_NOTIFICATION_PREFERENCES }
  }
}

export function setNotificationPreferences(prefs: NotificationPreferences): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch (error) {
    logger.error("Failed to save notification preferences:", error)
  }
}

export function shouldNotifyForRankChange(
  type: "rank_improved" | "rank_dropped" | "overtaken",
  changeMagnitude: number
): boolean {
  const prefs = getNotificationPreferences()
  if (!prefs.enabled) return false
  if (changeMagnitude < prefs.threshold) return false

  switch (type) {
    case "rank_improved":
      return prefs.rankImproved
    case "rank_dropped":
      return prefs.rankDropped
    case "overtaken":
      return prefs.overtaken
    default:
      return false
  }
}
