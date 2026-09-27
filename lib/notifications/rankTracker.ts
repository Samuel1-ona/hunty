import { logger } from "@/lib/logger"
import type { LeaderboardEntry } from "@/lib/types"
import type { LeaderboardRankNotification, RankSnapshot, HuntRankSnapshot } from "./types"

const SNAPSHOT_PREFIX = "hunty_rank_snapshot_"
const NOTIFICATIONS_KEY = "hunty_leaderboard_notifications"

function getSnapshotKey(huntId: number): string {
  return `${SNAPSHOT_PREFIX}${huntId}`
}

export function getStoredSnapshot(huntId: number): HuntRankSnapshot | null {
  if (typeof window === "undefined") return null

  try {
    const raw = localStorage.getItem(getSnapshotKey(huntId))
    if (!raw) return null
    return JSON.parse(raw) as HuntRankSnapshot
  } catch (error) {
    logger.error("Failed to load rank snapshot:", error)
    return null
  }
}

export function storeSnapshot(huntId: number, huntTitle: string, entries: RankSnapshot[]): void {
  if (typeof window === "undefined") return

  try {
    const snapshot: HuntRankSnapshot = {
      huntId,
      huntTitle,
      timestamp: Date.now(),
      entries,
    }
    localStorage.setItem(getSnapshotKey(huntId), JSON.stringify(snapshot))
  } catch (error) {
    logger.error("Failed to store rank snapshot:", error)
  }
}

export function detectRankChanges(
  huntId: number,
  huntTitle: string,
  currentAddress: string,
  currentEntries: LeaderboardEntry[]
): LeaderboardRankNotification[] {
  const notifications: LeaderboardRankNotification[] = []

  const sorted = [...currentEntries].sort((a, b) => b.points - a.points)
  const currentRank = sorted.findIndex(
    (e) => e.address.toLowerCase() === currentAddress.toLowerCase()
  )

  if (currentRank === -1) {
    storeSnapshot(huntId, huntTitle, sorted.map((e, i) => ({
      address: e.address,
      rank: i + 1,
      points: e.points,
      name: e.name,
    })))
    return notifications
  }

  const currentRankNumber = currentRank + 1
  const previousSnapshot = getStoredSnapshot(huntId)

  if (!previousSnapshot || previousSnapshot.entries.length === 0) {
    storeSnapshot(huntId, huntTitle, sorted.map((e, i) => ({
      address: e.address,
      rank: i + 1,
      points: e.points,
      name: e.name,
    })))
    return notifications
  }

  const previousEntry = previousSnapshot.entries.find(
    (e) => e.address.toLowerCase() === currentAddress.toLowerCase()
  )

  if (!previousEntry) {
    storeSnapshot(huntId, huntTitle, sorted.map((e, i) => ({
      address: e.address,
      rank: i + 1,
      points: e.points,
      name: e.name,
    })))
    return notifications
  }

  const rankChange = previousEntry.rank - currentRankNumber

  if (Math.abs(rankChange) > 0) {
    if (rankChange > 0) {
      notifications.push({
        id: `${Date.now()}-rank-improved-${huntId}`,
        type: "rank_improved",
        huntId,
        huntTitle,
        previousRank: previousEntry.rank,
        currentRank: currentRankNumber,
        timestamp: Date.now(),
        read: false,
      })
    } else {
      notifications.push({
        id: `${Date.now()}-rank-dropped-${huntId}`,
        type: "rank_dropped",
        huntId,
        huntTitle,
        previousRank: previousEntry.rank,
        currentRank: currentRankNumber,
        timestamp: Date.now(),
        read: false,
      })
    }
  }

  const playersWhoOvertook = sorted
    .slice(0, currentRank)
    .filter((e) => {
      const wasBehindEntry = previousSnapshot.entries.find(
        (pe) =>
          pe.address.toLowerCase() === e.address.toLowerCase() &&
          pe.rank > previousEntry.rank
      )
      return !!wasBehindEntry
    })

  if (playersWhoOvertook.length > 0) {
    for (const overtaker of playersWhoOvertook) {
      if (overtaker.address.toLowerCase() === currentAddress.toLowerCase()) continue
      const alreadyAdded = notifications.some(
        (n) => n.type === "overtaken" && n.overtakenBy === (overtaker.name || overtaker.address.slice(0, 6))
      )
      if (!alreadyAdded) {
        notifications.push({
          id: `${Date.now()}-overtaken-${huntId}-${overtaker.address.slice(0, 8)}`,
          type: "overtaken",
          huntId,
          huntTitle,
          previousRank: previousEntry.rank,
          currentRank: currentRankNumber,
          overtakenBy: overtaker.name || overtaker.address.slice(0, 6),
          timestamp: Date.now(),
          read: false,
        })
      }
    }
  }

  storeSnapshot(huntId, huntTitle, sorted.map((e, i) => ({
    address: e.address,
    rank: i + 1,
    points: e.points,
    name: e.name,
  })))

  return notifications
}

export function getStoredNotifications(): LeaderboardRankNotification[] {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as LeaderboardRankNotification[]
  } catch (error) {
    logger.error("Failed to load stored notifications:", error)
    return []
  }
}

export function saveNotifications(notifications: LeaderboardRankNotification[]): void {
  if (typeof window === "undefined") return

  try {
    const existing = getStoredNotifications()
    const merged = [...notifications, ...existing]
      .filter((n, i, arr) => arr.findIndex((x) => x.id === n.id) === i)
      .sort((a, b) => b.timestamp - a.timestamp)
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(merged))
  } catch (error) {
    logger.error("Failed to save notifications:", error)
  }
}

export function markNotificationRead(notificationId: string): void {
  if (typeof window === "undefined") return

  try {
    const notifications = getStoredNotifications()
    const updated = notifications.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n
    )
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated))
  } catch (error) {
    logger.error("Failed to mark notification as read:", error)
  }
}

export function markAllNotificationsRead(): void {
  if (typeof window === "undefined") return

  try {
    const notifications = getStoredNotifications()
    const updated = notifications.map((n) => ({ ...n, read: true }))
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated))
  } catch (error) {
    logger.error("Failed to mark all notifications as read:", error)
  }
}

export function clearNotifications(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(NOTIFICATIONS_KEY)
  } catch (error) {
    logger.error("Failed to clear notifications:", error)
  }
}

export function getUnreadNotificationCount(): number {
  return getStoredNotifications().filter((n) => !n.read).length
}
