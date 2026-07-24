export type LeaderboardRankNotificationType = "rank_improved" | "rank_dropped" | "overtaken"

export interface LeaderboardRankNotification {
  id: string
  type: LeaderboardRankNotificationType
  huntId: number
  huntTitle: string
  previousRank: number
  currentRank: number
  overtakenBy?: string
  timestamp: number
  read: boolean
}

export interface RankSnapshot {
  address: string
  rank: number
  points: number
  name?: string
}

export interface HuntRankSnapshot {
  huntId: number
  huntTitle: string
  timestamp: number
  entries: RankSnapshot[]
}

export interface NotificationPreferences {
  enabled: boolean
  rankImproved: boolean
  rankDropped: boolean
  overtaken: boolean
  weeklyDigest: boolean
  /** Minimum rank change to trigger a notification (default: 1) */
  threshold: number
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  rankImproved: true,
  rankDropped: true,
  overtaken: true,
  weeklyDigest: true,
  threshold: 1,
}
