import { ValidationError } from "@/lib/api/errors"

/**
 * Follows domain logic.
 *
 * Players can follow creators. When a creator publishes a new hunt, every
 * follower is notified. The follow graph is kept in an in-memory store so the
 * public API surface works without a database connection (mirroring the
 * in-memory hunt store used by the feed). A `resetFollowsStore()` helper is
 * provided for tests.
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

export function followCreator(followerWallet: string, creatorWallet: string): FollowRecord {
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
  follows.set(key, record)
  return record
}

export function unfollowCreator(followerWallet: string, creatorWallet: string): boolean {
  if (!followerWallet) throw new ValidationError("followerWallet is required")
  if (!creatorWallet) throw new ValidationError("creatorWallet is required")

  const key = followKey(followerWallet, creatorWallet)
  return follows.delete(key)
}

export function isFollowing(followerWallet: string, creatorWallet: string): boolean {
  if (!followerWallet || !creatorWallet) return false
  return follows.has(followKey(followerWallet, creatorWallet))
}

export function getFollowing(followerWallet: string): string[] {
  if (!followerWallet) return []
  const follower = normalizeWallet(followerWallet)
  const result: string[] = []
  for (const record of follows.values()) {
    if (record.followerWallet === follower) result.push(record.creatorWallet)
  }
  return result
}

export function getFollowers(creatorWallet: string): string[] {
  if (!creatorWallet) return []
  const creator = normalizeWallet(creatorWallet)
  const result: string[] = []
  for (const record of follows.values()) {
    if (record.creatorWallet === creator) result.push(record.followerWallet)
  }
  return result
}

export function getFollowersCount(creatorWallet: string): number {
  return getFollowers(creatorWallet).length
}

/**
 * Notify every follower of `creatorWallet` that a new hunt was published.
 * Returns the notifications that were created (one per follower).
 */
export function notifyFollowersOfNewHunt(
  creatorWallet: string,
  hunt: { id: number; title: string }
): FollowNotification[] {
  if (!creatorWallet) throw new ValidationError("creatorWallet is required")
  if (!hunt || typeof hunt.id !== "number" || !Number.isFinite(hunt.id)) {
    throw new ValidationError("hunt.id is required")
  }

  const creator = normalizeWallet(creatorWallet)
  const followers = getFollowers(creator)
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

  return created
}

export function getFollowNotifications(recipientWallet: string): FollowNotification[] {
  if (!recipientWallet) return []
  return notifications.get(normalizeWallet(recipientWallet)) ?? []
}

/** Test helper: clear all follow state. */
export function resetFollowsStore(): void {
  follows.clear()
  notifications.clear()
}
