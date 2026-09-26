/**
 * Persistent push subscription store.
 *
 * Subscriptions are backed by PostgreSQL when DATABASE_URL is configured,
 * with an in-memory cache as a fast path and fallback for local development
 * and unit tests.
 *
 * Server-side only — do not import from client components.
 */

import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

import type { WebPushSubscriptionRecord } from "./types"

/** Keyed by subscription endpoint for O(1) deduplication and removal. */
const memoryStore = new Map<string, WebPushSubscriptionRecord>()

function walletKey(walletAddress: string): string {
  return walletAddress.trim().toLowerCase()
}

// ─── Database helpers ──────────────────────────────────────────────────

async function fetchAllFromDb(): Promise<WebPushSubscriptionRecord[]> {
  const sql = getDb()
  const rows = await sql<{
    endpoint: string
    wallet_address: string
    subscription: string
    registered_at: Date
    preferences: string | null
  }[]>`SELECT endpoint, wallet_address, subscription, registered_at, preferences FROM push_subscriptions`

  return rows.map((row) => ({
    subscription: JSON.parse(row.subscription) as PushSubscriptionJSON,
    walletAddress: row.wallet_address,
    registeredAt: row.registered_at.getTime(),
    preferences: row.preferences
      ? (JSON.parse(row.preferences) as WebPushSubscriptionRecord["preferences"])
      : undefined,
  }))
}

async function fetchFromDb(endpoint: string): Promise<WebPushSubscriptionRecord | null> {
  const sql = getDb()
  const [row] = await sql<{
    endpoint: string
    wallet_address: string
    subscription: string
    registered_at: Date
    preferences: string | null
  }[]>`SELECT endpoint, wallet_address, subscription, registered_at, preferences FROM push_subscriptions WHERE endpoint = ${endpoint}`

  if (!row) return null
  return {
    subscription: JSON.parse(row.subscription) as PushSubscriptionJSON,
    walletAddress: row.wallet_address,
    registeredAt: row.registered_at.getTime(),
    preferences: row.preferences
      ? (JSON.parse(row.preferences) as WebPushSubscriptionRecord["preferences"])
      : undefined,
  }
}

async function fetchFromDbByWallet(walletAddress: string): Promise<WebPushSubscriptionRecord[]> {
  const sql = getDb()
  const target = walletKey(walletAddress)
  const rows = await sql<{
    endpoint: string
    wallet_address: string
    subscription: string
    registered_at: Date
    preferences: string | null
  }[]>`SELECT endpoint, wallet_address, subscription, registered_at, preferences FROM push_subscriptions WHERE wallet_address = ${target}`

  return rows.map((row) => ({
    subscription: JSON.parse(row.subscription) as PushSubscriptionJSON,
    walletAddress: row.wallet_address,
    registeredAt: row.registered_at.getTime(),
    preferences: row.preferences
      ? (JSON.parse(row.preferences) as WebPushSubscriptionRecord["preferences"])
      : undefined,
  }))
}

async function fetchFromDbByWallets(walletAddresses: string[]): Promise<WebPushSubscriptionRecord[]> {
  if (walletAddresses.length === 0) return []
  const sql = getDb()
  const targets = walletAddresses.map(walletKey)
  const rows = await sql<{
    endpoint: string
    wallet_address: string
    subscription: string
    registered_at: Date
    preferences: string | null
  }[]>`SELECT endpoint, wallet_address, subscription, registered_at, preferences FROM push_subscriptions WHERE wallet_address IN (${targets})`

  return rows.map((row) => ({
    subscription: JSON.parse(row.subscription) as PushSubscriptionJSON,
    walletAddress: row.wallet_address,
    registeredAt: row.registered_at.getTime(),
    preferences: row.preferences
      ? (JSON.parse(row.preferences) as WebPushSubscriptionRecord["preferences"])
      : undefined,
  }))
}

async function upsertInDb(record: WebPushSubscriptionRecord): Promise<void> {
  const sql = getDb()
  await sql`
    INSERT INTO push_subscriptions (endpoint, wallet_address, subscription, registered_at, preferences)
    VALUES (${record.subscription.endpoint}, ${record.walletAddress}, ${JSON.stringify(record.subscription)}, ${new Date(record.registeredAt)}, ${record.preferences ? JSON.stringify(record.preferences) : null})
    ON CONFLICT (endpoint) DO UPDATE SET
      wallet_address = EXCLUDED.wallet_address,
      subscription = EXCLUDED.subscription,
      registered_at = EXCLUDED.registered_at,
      preferences = EXCLUDED.preferences
  `
}

async function removeFromDb(endpoint: string): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`
}

async function removeFromDbByWallet(walletAddress: string): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM push_subscriptions WHERE wallet_address = ${walletKey(walletAddress)}`
}

// ─── Cache helpers ─────────────────────────────────────────────────────

function loadCache(): void {
  if (memoryStore.size > 0) return
  fetchAllFromDb()
    .then((records) => {
      for (const record of records) {
        memoryStore.set(record.subscription.endpoint, record)
      }
    })
    .catch((err) => {
      logger.warn("[subscriptionStore] Failed to preload subscriptions from database", err)
    })
}

// ─── Mutation ──────────────────────────────────────────────────────────

/**
 * Adds or updates a push subscription for the given wallet address.
 * Optionally stores the user's per-type preference flags so the server
 * can respect per-user opt-in flags without needing to access client-side localStorage.
 */
export async function upsertSubscription(
  subscription: PushSubscriptionJSON,
  walletAddress: string,
  preferences?: WebPushSubscriptionRecord["preferences"]
): Promise<void> {
  if (!subscription.endpoint) return

  const key = subscription.endpoint
  const existing = memoryStore.get(key)
  const record: WebPushSubscriptionRecord = {
    subscription,
    walletAddress: walletAddress.toLowerCase(),
    registeredAt: existing?.registeredAt ?? Date.now(),
    preferences: preferences ?? existing?.preferences,
  }

  memoryStore.set(key, record)

  if (process.env.DATABASE_URL) {
    try {
      await upsertInDb(record)
    } catch (err) {
      logger.warn("[subscriptionStore] Failed to persist subscription to database", err)
    }
  }
}

/**
 * Removes a subscription by endpoint URL.
 */
export async function removeSubscription(endpoint: string): Promise<void> {
  memoryStore.delete(endpoint)

  if (process.env.DATABASE_URL) {
    try {
      await removeFromDb(endpoint)
    } catch (err) {
      logger.warn("[subscriptionStore] Failed to remove subscription from database", err)
    }
  }
}

/**
 * Removes all subscriptions for a wallet address.
 */
export async function removeSubscriptionsForWallet(walletAddress: string): Promise<void> {
  const target = walletKey(walletAddress)
  for (const [endpoint, record] of memoryStore) {
    if (record.walletAddress === target) {
      memoryStore.delete(endpoint)
    }
  }

  if (process.env.DATABASE_URL) {
    try {
      await removeFromDbByWallet(target)
    } catch (err) {
      logger.warn("[subscriptionStore] Failed to remove subscriptions from database", err)
    }
  }
}

// ─── Query ─────────────────────────────────────────────────────────────

/**
 * Returns all subscriptions for a given wallet address.
 */
export async function getSubscriptionsForWallet(
  walletAddress: string
): Promise<WebPushSubscriptionRecord[]> {
  const target = walletKey(walletAddress)

  if (process.env.DATABASE_URL) {
    try {
      const records = await fetchFromDbByWallet(target)
      // Sync the memory cache with what we read from the database.
      for (const record of records) {
        memoryStore.set(record.subscription.endpoint, record)
      }
      return records
    } catch (err) {
      logger.warn("[subscriptionStore] Failed to read subscriptions from database", err)
    }
  }

  return [...memoryStore.values()].filter((r) => r.walletAddress === target)
}

/**
 * Returns all subscriptions for a list of wallet addresses.
 */
export async function getSubscriptionsByWallets(
  walletAddresses: string[]
): Promise<WebPushSubscriptionRecord[]> {
  const targets = new Set(walletAddresses.map(walletKey))

  if (process.env.DATABASE_URL) {
    try {
      const records = await fetchFromDbByWallets([...targets])
      for (const record of records) {
        memoryStore.set(record.subscription.endpoint, record)
      }
      return records
    } catch (err) {
      logger.warn("[subscriptionStore] Failed to read subscriptions from database", err)
    }
  }

  return [...memoryStore.values()].filter((r) => targets.has(r.walletAddress))
}

/**
 * Returns all stored subscription records (admin / diagnostics use only).
 */
export async function getAllSubscriptions(): Promise<WebPushSubscriptionRecord[]> {
  if (process.env.DATABASE_URL) {
    try {
      const records = await fetchAllFromDb()
      for (const record of records) {
        memoryStore.set(record.subscription.endpoint, record)
      }
      return records
    } catch (err) {
      logger.warn("[subscriptionStore] Failed to read subscriptions from database", err)
    }
  }

  return [...memoryStore.values()]
}

/**
 * Returns the total number of stored subscriptions.
 */
export async function getSubscriptionCount(): Promise<number> {
  if (process.env.DATABASE_URL) {
    try {
      const sql = getDb()
      const [row] = await sql<{ count: string }[]>`SELECT COUNT(*) AS count FROM push_subscriptions`
      return Number(row?.count ?? memoryStore.size)
    } catch (err) {
      logger.warn("[subscriptionStore] Failed to count subscriptions from database", err)
    }
  }

  return memoryStore.size
}

// Preload the in-memory cache on module load when a database is configured.
if (process.env.DATABASE_URL) {
  loadCache()
}

/**
 * Reset the in-memory cache.
 * Intended for test isolation only — does not affect the database.
 */
export function clearSubscriptionStore(): void {
  memoryStore.clear()
}
