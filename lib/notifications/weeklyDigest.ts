import { logger } from "@/lib/logger"
import type { LeaderboardRankNotification } from "./types"
import { getStoredNotifications, saveNotifications } from "./rankTracker"

const WEEKLY_DIGEST_KEY = "hunty_weekly_digest_last_sent"

export interface WeeklyDigestEntry {
  huntId: number
  huntTitle: string
  bestRank: number
  worstRank: number
  currentRank: number
  totalChanges: number
  improvements: number
  drops: number
}

export interface WeeklyDigest {
  weekStart: number
  weekEnd: number
  entries: WeeklyDigestEntry[]
  totalNotifications: number
}

export function getLastDigestTimestamp(): number {
  if (typeof window === "undefined") return 0
  try {
    return parseInt(localStorage.getItem(WEEKLY_DIGEST_KEY) || "0", 10)
  } catch {
    return 0
  }
}

export function setLastDigestTimestamp(timestamp: number): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(WEEKLY_DIGEST_KEY, timestamp.toString())
  } catch (error) {
    logger.error("Failed to save digest timestamp:", error)
  }
}

export function generateWeeklyDigest(): WeeklyDigest | null {
  const notifications = getStoredNotifications()
  if (notifications.length === 0) return null

  const now = Date.now()
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

  const lastSent = getLastDigestTimestamp()

  const weekNotifications = notifications
    .filter((n) => n.timestamp > oneWeekAgo && n.timestamp > lastSent)
    .sort((a, b) => a.timestamp - b.timestamp)

  if (weekNotifications.length === 0) return null

  const huntMap = new Map<number, WeeklyDigestEntry>()

  for (const n of weekNotifications) {
    let entry = huntMap.get(n.huntId)
    if (!entry) {
      entry = {
        huntId: n.huntId,
        huntTitle: n.huntTitle,
        bestRank: n.currentRank,
        worstRank: n.currentRank,
        currentRank: n.currentRank,
        totalChanges: 0,
        improvements: 0,
        drops: 0,
      }
      huntMap.set(n.huntId, entry)
    }

    entry.totalChanges++
    entry.currentRank = n.currentRank

    if (n.previousRank < entry.bestRank) entry.bestRank = n.previousRank
    if (n.previousRank > entry.worstRank) entry.worstRank = n.previousRank
    if (n.currentRank < entry.bestRank) entry.bestRank = n.currentRank
    if (n.currentRank > entry.worstRank) entry.worstRank = n.currentRank

    if (n.type === "rank_improved") entry.improvements++
    if (n.type === "rank_dropped" || n.type === "overtaken") entry.drops++
  }

  return {
    weekStart: oneWeekAgo,
    weekEnd: now,
    entries: Array.from(huntMap.values()),
    totalNotifications: weekNotifications.length,
  }
}

export function shouldSendWeeklyDigest(): boolean {
  const lastSent = getLastDigestTimestamp()
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return lastSent < oneWeekAgo
}

export function createWeeklyDigestNotification(): string | null {
  try {
    const digest = generateWeeklyDigest()
    if (!digest || digest.entries.length === 0) return null

    const digestNotification: LeaderboardRankNotification = {
      id: `weekly-digest-${Date.now()}`,
      type: "rank_improved",
      huntId: 0,
      huntTitle: "Weekly Rank Summary",
      previousRank: 0,
      currentRank: 0,
      timestamp: Date.now(),
      read: false,
    }

    const existing = getStoredNotifications()
    const hasDigest = existing.some(
      (n) => n.id === digestNotification.id || n.id.startsWith("weekly-digest-")
    )
    if (hasDigest) return null

    saveNotifications([digestNotification, ...existing])
    setLastDigestTimestamp(Date.now())

    const summaryParts = digest.entries.map(
      (e) =>
        `"${e.huntTitle}": ${e.totalChanges} change${e.totalChanges !== 1 ? "s" : ""} (${e.currentRank === 1 ? "🥇" : `#${e.currentRank}`})`
    )

    return `Your weekly rank summary is ready!\n${summaryParts.join("\n")}`
  } catch (error) {
    logger.error("Failed to create weekly digest:", error)
    return null
  }
}
