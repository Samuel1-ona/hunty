import { logger } from "@/lib/logger"

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
  type NotificationCategory,
  type NotificationPreferences,
} from "./types"

const PREFS_KEY = "hunty_notification_prefs"

export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_NOTIFICATION_PREFERENCES }

  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES }
    return normalizeNotificationPreferences(JSON.parse(raw) as Partial<NotificationPreferences>)
  } catch (error) {
    logger.error("Failed to load notification preferences:", error)
    return { ...DEFAULT_NOTIFICATION_PREFERENCES }
  }
}

export function setNotificationPreferences(prefs: NotificationPreferences): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(normalizeNotificationPreferences(prefs)))
  } catch (error) {
    logger.error("Failed to save notification preferences:", error)
  }
}

/** Fetch the wallet's canonical preferences for cross-device hydration. */
export async function fetchNotificationPreferences(
  walletAddress: string
): Promise<NotificationPreferences | null> {
  if (!walletAddress) return null

  try {
    const response = await fetch(
      `/api/v1/notifications/preferences?walletAddress=${encodeURIComponent(walletAddress)}`,
      { headers: { Accept: "application/json" } }
    )
    if (!response.ok) return null

    const body = (await response.json()) as {
      preferences?: Partial<NotificationPreferences>
    }
    if (!body.preferences) return null

    const preferences = normalizeNotificationPreferences(body.preferences)
    setNotificationPreferences(preferences)
    return preferences
  } catch (error) {
    logger.warn("Failed to fetch notification preferences; using local copy", error)
    return null
  }
}

/** Persist the preference document for a connected wallet. */
export async function syncNotificationPreferences(
  walletAddress: string,
  prefs: NotificationPreferences
): Promise<boolean> {
  if (!walletAddress) return false

  const preferences = normalizeNotificationPreferences(prefs)
  setNotificationPreferences(preferences)

  try {
    const response = await fetch("/api/v1/notifications/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, preferences }),
    })
    return response.ok
  } catch (error) {
    logger.warn("Failed to sync notification preferences", error)
    return false
  }
}

/** Global mute is checked before an individual category is evaluated. */
export function shouldNotifyForCategory(category: NotificationCategory): boolean {
  const prefs = getNotificationPreferences()
  return prefs.enabled && prefs[category]
}

export function shouldNotifyForRankChange(
  type: "rank_improved" | "rank_dropped" | "overtaken",
  changeMagnitude: number
): boolean {
  const prefs = getNotificationPreferences()
  if (!prefs.enabled || !prefs.social) return false
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
