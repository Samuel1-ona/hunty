import { getDb } from "@/lib/db"
import { logger } from "@/lib/logger"
import { ValidationError } from "@/lib/api/errors"

/**
 * Follows domain logic.
 *
 * Players can follow creators. When a creator publishes a new hunt, every
 * follower is notified.
 *
 * Follows and follow notifications are persisted in PostgreSQL when
 * DATABASE_URL is configured (migration `010_create_follows.sql` creates the
 * `creator_follows` and `follow_notifications` tables). An in-memory Map is
 * kept as a fallback so the public API surface and unit tests keep working
 * without a database connection, mirroring the pattern used by
 * `notificationPreferencesStore`. A `resetFollowsStore()` helper is provided
 * for tests.
 */

export interface FollowRecord {
  followerWallet: string
  creatorWallet: string
  followedAt: number
}

export interface FollowNotification {
  id: string
  recipientWallet: string
  creatorWallet: string
  huntId: number
  huntTitle: string
  createdAt: number
}

function normalizeWallet(wallet: string): string {
  return wallet.trim().toLowerCase()
}

const follows = new Map<string, FollowRecord>()
const notifications = new Map<string, FollowNotification[]>()

function followKey(followerWallet: string, creatorWallet: string): string {
  return `${normalizeWallet(followerWallet)}:${normalizeWallet(creatorWallet)}`
}

/**
 * Whether a durable PostgreSQL store is configured. Reads and writes always go
 * through the in-memory Map too, so tests and local development keep working
 * when DATABASE_URL is unset.
 */
function isDurable(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

function toMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime()
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return Date.now()
}

export async function followCreator(
  followerWallet: string,
  creatorWallet: string
): Promise<FollowRecord> {
  if (!followerWallet) throw new ValidationError("followerWallet is required")
  if (!creatorWallet) throw new ValidationError("creatorWallet is required")

  const follower = normalizeWallet(followerWallet)
  const creator = normalizeWallet(creatorWallet)

  if (follower === creator) {
    throw new ValidationError("You cannot follow yourself")
  }

  const key = followKey(follower, creator)
  const existing = follows.get(key)
  if (existing) return existing

  const record: FollowRecord = {
    followerWallet: follower,
    creatorWallet: creator,
    followedAt: Date.now(),
  }

  if (isDurable()) {
    try {
      const sql = getDb()
      const [row] = await sql`
        INSERT INTO creator_follows (follower_wallet, creator_wallet, followed_at)
        VALUES (${follower}, ${creator}, to_timestamp(${record.followedAt} / 1000.0))
        ON CONFLICT (follower_wallet, creator_wallet) DO NOTHING
        RETURNING followed_at
      `
      if (row?.followed_at != null) {
        record.followedAt = toMillis(row.followed_at)
      } else {
        // The row already existed (conflict); keep the original follow time so
        // the operation stays idempotent across processes.
        const [stored] = await sql`
          SELECT followed_at FROM creator_follows
          WHERE follower_wallet = ${follower} AND creator_wallet = ${creator}
        `
        if (stored?.followed_at != null) record.followedAt = toMillis(stored.followed_at)
      }
    } catch (error) {
      logger.warn("Failed to persist follow to database", error)
    }
  }

  follows.set(key, record)
  return record
}

export async function unfollowCreator(
  followerWallet: string,
  creatorWallet: string
): Promise<boolean> {
  if (!followerWallet) throw new ValidationError("followerWallet is required")
  if (!creatorWallet) throw new ValidationError("creatorWallet is required")

  const follower = normalizeWallet(followerWallet)
  const creator = normalizeWallet(creatorWallet)
  const key = followKey(follower, creator)
  const removedFromMemory = follows.delete(key)

  if (!isDurable()) return removedFromMemory

  try {
    const sql = getDb()
    const removed = await sql`
      DELETE FROM creator_follows
      WHERE follower_wallet = ${follower} AND creator_wallet = ${creator}
      RETURNING 1
    `
    return removed.length > 0
  } catch (error) {
    logger.warn("Failed to delete follow from database", error)
    return removedFromMemory
  }
}

export async function isFollowing(
  followerWallet: string,
  creatorWallet: string
): Promise<boolean> {
  if (!followerWallet || !creatorWallet) return false

  const key = followKey(followerWallet, creatorWallet)
  if (follows.has(key)) return true
  if (!isDurable()) return false

  try {
    const sql = getDb()
    const rows = await sql`
      SELECT 1 FROM creator_follows
      WHERE follower_wallet = ${normalizeWallet(followerWallet)}
        AND creator_wallet = ${normalizeWallet(creatorWallet)}
      LIMIT 1
    `
    return rows.length > 0
  } catch (error) {
    logger.warn("Failed to read follow from database", error)
    return false
  }
}

export async function getFollowing(followerWallet: string): Promise<string[]> {
  if (!followerWallet) return []
  const follower = normalizeWallet(followerWallet)

  if (isDurable()) {
    try {
      const sql = getDb()
      const rows = await sql`
        SELECT creator_wallet FROM creator_follows
        WHERE follower_wallet = ${follower}
        ORDER BY followed_at ASC
      `
      return rows.map((row) => row.creator_wallet as string)
    } catch (error) {
      logger.warn("Failed to list follows from database", error)
    }
  }

  const result: string[] = []
  for (const record of follows.values()) {
    if (record.followerWallet === follower) result.push(record.creatorWallet)
  }
  return result
}

export async function getFollowers(creatorWallet: string): Promise<string[]> {
  if (!creatorWallet) return []
  const creator = normalizeWallet(creatorWallet)

  if (isDurable()) {
    try {
      const sql = getDb()
      const rows = await sql`
        SELECT follower_wallet FROM creator_follows
        WHERE creator_wallet = ${creator}
        ORDER BY followed_at ASC
      `
      return rows.map((row) => row.follower_wallet as string)
    } catch (error) {
      logger.warn("Failed to list followers from database", error)
    }
  }

  const result: string[] = []
  for (const record of follows.values()) {
    if (record.creatorWallet === creator) result.push(record.followerWallet)
  }
  return result
}

export async function getFollowersCount(creatorWallet: string): Promise<number> {
  return (await getFollowers(creatorWallet)).length
}

/**
 * Notify every follower of `creatorWallet` that a new hunt was published.
 * Returns the notifications that were created (one per follower).
 */
export async function notifyFollowersOfNewHunt(
  creatorWallet: string,
  hunt: { id: number; title: string }
): Promise<FollowNotification[]> {
  if (!creatorWallet) throw new ValidationError("creatorWallet is required")
  if (!hunt || typeof hunt.id !== "number" || !Number.isFinite(hunt.id)) {
    throw new ValidationError("hunt.id is required")
  }

  const creator = normalizeWallet(creatorWallet)
  const followers = await getFollowers(creator)
  const created: FollowNotification[] = []

  for (const follower of followers) {
    const notification: FollowNotification = {
      id: `${follower}:${hunt.id}:${Date.now()}`,
      recipientWallet: follower,
      creatorWallet: creator,
      huntId: hunt.id,
      huntTitle: hunt.title,
      createdAt: Date.now(),
    }
    const bucket = notifications.get(follower) ?? []
    bucket.unshift(notification)
    notifications.set(follower, bucket)
    created.push(notification)
  }

  if (created.length > 0 && isDurable()) {
    try {
      const sql = getDb()
      for (const notification of created) {
        await sql`
          INSERT INTO follow_notifications
            (id, recipient_wallet, creator_wallet, hunt_id, hunt_title, created_at)
          VALUES (
            ${notification.id},
            ${notification.recipientWallet},
            ${notification.creatorWallet},
            ${notification.huntId},
            ${notification.huntTitle},
            to_timestamp(${notification.createdAt} / 1000.0)
          )
          ON CONFLICT (id) DO NOTHING
        `
      }
    } catch (error) {
      // The notifications are already in the in-memory bucket; a transient
      // database outage should not break the publish flow.
      logger.warn("Failed to persist follow notifications to database", error)
    }
  }

  return created
}

export async function getFollowNotifications(
  recipientWallet: string
): Promise<FollowNotification[]> {
  if (!recipientWallet) return []
  const recipient = normalizeWallet(recipientWallet)

  if (isDurable()) {
    try {
      const sql = getDb()
      const rows = await sql`
        SELECT id, recipient_wallet, creator_wallet, hunt_id, hunt_title, created_at
        FROM follow_notifications
        WHERE recipient_wallet = ${recipient}
        ORDER BY created_at DESC
      `
      const stored: FollowNotification[] = rows.map((row) => ({
        id: row.id as string,
        recipientWallet: row.recipient_wallet as string,
        creatorWallet: row.creator_wallet as string,
        huntId: Number(row.hunt_id),
        huntTitle: row.hunt_title as string,
        createdAt: toMillis(row.created_at),
      }))
      notifications.set(recipient, stored)
      return stored
    } catch (error) {
      logger.warn("Failed to read follow notifications from database", error)
    }
  }

  return notifications.get(recipient) ?? []
}

/** Test helper: clear all process-local follow state. */
export function resetFollowsStore(): void {
  follows.clear()
  notifications.clear()
}
