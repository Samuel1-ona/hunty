// ─── Web Push ─────────────────────────────────────────────────────────────────

/**
 * The push notification event types sent from the server to the service worker.
 */
export type PushEventType =
  | "hunt_start"
  | "hunt_cancelled"
  | "leaderboard_overtake"
  | "player_registered"   // creator receives: someone registered for their hunt
  | "first_completion"    // creator receives: first player completed their hunt

export interface WebPushSubscriptionRecord {
  /** The full PushSubscription JSON from the browser */
  subscription: PushSubscriptionJSON
  /** Stellar wallet address used as the user identity */
  walletAddress: string
  /** Unix timestamp when the subscription was registered */
  registeredAt: number
  /**
   * Per-type opt-in flags synced from the user's NotificationPreferences.
   * When absent the default is to allow delivery (opt-in assumed).
   */
  preferences?: {
    /** Global notification mute, independent from browser permission. */
    enabled?: boolean
    huntEvents?: boolean
    rewards?: boolean
    social?: boolean
    achievements?: boolean
    huntStart?: boolean
    overtake?: boolean
    huntCancelled?: boolean
    playerRegistered?: boolean
    firstCompletion?: boolean
  }
}

/**
 * Maps a PushEventType to the preferences flag that gates it.
 */
export const PUSH_EVENT_PREFERENCE_KEY: Record<PushEventType, keyof NonNullable<WebPushSubscriptionRecord["preferences"]>> = {
  hunt_start: "huntStart",
  leaderboard_overtake: "overtake",
  hunt_cancelled: "huntCancelled",
  player_registered: "playerRegistered",
  first_completion: "firstCompletion",
}

export interface PushPayload {
  title: string
  body: string
  /** Icon URL — defaults to /icons/icon-192x192.png in the service worker */
  icon?: string
  /** Tag for deduplication */
  tag?: string
  /** Client-side navigation target when the notification is clicked */
  url?: string
  /** Extra data forwarded to notificationclick */
  data?: Record<string, unknown>
}

// ─── Leaderboard Rank Notifications ──────────────────────────────────────────

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

export type NotificationCategory = "huntEvents" | "rewards" | "social" | "achievements"

export interface NotificationPreferences {
  /** Global mute — false suppresses every notification channel. */
  enabled: boolean
  /** Independent hunt lifecycle category. */
  huntEvents: boolean
  /** Independent rewards/progress category. */
  rewards: boolean
  /** Independent social/competition category. */
  social: boolean
  /** Independent achievement category. */
  achievements: boolean
  rankImproved: boolean
  rankDropped: boolean
  overtaken: boolean
  weeklyDigest: boolean
  /** Minimum rank change to trigger a notification (default: 1) */
  threshold: number
  // ─── Web Push ──────────────────────────────────────────────────────────────
  /** Whether the user has opted in to Web Push notifications */
  pushEnabled: boolean
  /** Receive a push when a hunt you registered for starts */
  pushHuntStart: boolean
  /** Receive a push when you are overtaken on the leaderboard */
  pushOvertake: boolean
  /** Receive a push when a hunt you are in gets cancelled */
  pushHuntCancelled: boolean
  /** Creator: receive a push when a player registers for your hunt */
  pushPlayerRegistered: boolean
  /** Creator: receive a push when the first player completes your hunt */
  pushFirstCompletion: boolean
}

export type NotificationPreferencesPatch = Partial<NotificationPreferences>

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  huntEvents: true,
  rewards: true,
  social: true,
  achievements: true,
  rankImproved: true,
  rankDropped: true,
  overtaken: true,
  weeklyDigest: true,
  threshold: 1,
  pushEnabled: false,
  pushHuntStart: true,
  pushOvertake: true,
  pushHuntCancelled: true,
  pushPlayerRegistered: true,
  pushFirstCompletion: true,
}

const BOOLEAN_PREFERENCE_KEYS = [
  "enabled",
  "huntEvents",
  "rewards",
  "social",
  "achievements",
  "rankImproved",
  "rankDropped",
  "overtaken",
  "weeklyDigest",
  "pushEnabled",
  "pushHuntStart",
  "pushOvertake",
  "pushHuntCancelled",
  "pushPlayerRegistered",
  "pushFirstCompletion",
] as const

/** Merge untrusted or legacy data with the current defaults. */
export function normalizeNotificationPreferences(
  value: NotificationPreferencesPatch | null | undefined
): NotificationPreferences {
  const input = value ?? {}
  const result = { ...DEFAULT_NOTIFICATION_PREFERENCES }

  for (const key of BOOLEAN_PREFERENCE_KEYS) {
    if (typeof input[key] === "boolean") result[key] = input[key] as boolean
  }

  if (typeof input.threshold === "number" && Number.isFinite(input.threshold)) {
    result.threshold = Math.max(1, Math.floor(input.threshold))
  }

  return result
}
