/**
 * Persistent push subscription store.
 *
 * Uses PostgreSQL as the durable backing store so that registered
 * devices survive instance recycling.  An in-memory Map is kept as
 * a read-through cache to avoid repeated DB hits for the same endpoint.
 *
 * Server-side only — do not import from client components.
 */

import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

import type { WebPushSubscriptionRecord } from "./types"

/** Keyed by subscription endpoint for O(1) deduplication and removal. */
const memoryStore = new Map<string, WebPushSubscriptionRecord>()

function endpointKey(endpoint: string): string {
  return endpoint
}

function walletKey(walletAddress: string): string {
  return walletAddress.trim().toLowerCase()
}

// ─── Database ────────────────────────────────────────────────────────────

async function fetchAllFromDb(): Promise<WebPushSubscriptionRecord[]> {
  const sql = getDb()
  const rows = await sql`
    SELECT endpoint, wallet_address, subscription, preferences, owner_secret, registered_at
    FROM push_subscriptions
  `
  return rows.map((row) => ({
    subscription: row.subscription as PushSubscriptionJSON,
    walletAddress: row.wallet_address,
    registeredAt: row.registered_at.getTime(),
    preferences: row.preferences ?? undefined,
    ownerSecret: row.owner_secret,
  }))
}

/**
 * Hydrates the in-memory store from the database on first access.
 * Subsequent calls are no-ops once the store is populated.
 */
let storeHydrated = false

async function hydrateStore(): Promise<void> {
  if (storeHydrated) return
  if (!process.env.DATABASE_URL) {
    storeHydrated = true
    return
  }
  try {
    const records = await fetchAllFromDb()
    for (const record of records) {
      memoryStore.set(endpointKey(record.subscription.endpoint), record)
    }
    storeHydrated = true
  } catch (error) {
    logger.warn("[subscriptionStore] Failed to hydrate from database", error)
    storeHydrated = true
  }
}

// ─── Mutation ─────────────────────────────────────────────────────────────────

/**
 * Adds or updates a push subscription for the given wallet address.
 * Optionally stores the user's per-type preference flags so the server
 * can filter before sending.
 */
export async function upsertSubscription(
  subscription: PushSubscriptionJSON,
  walletAddress: string,
  preferences?: WebPushSubscriptionRecord["preferences"],
  ownerSecret?: string
): Promise<void> {
  if (!subscription.endpoint) return

  const normalizedWallet = walletKey(walletAddress)
  const key = endpointKey(subscription.endpoint)
  const existing = memoryStore.get(key)

  const record: WebPushSubscriptionRecord = {
    subscription,
    walletAddress: normalizedWallet,
    registeredAt: existing?.registeredAt ?? Date.now(),
    preferences: preferences ?? existing?.preferences,
    ownerSecret: ownerSecret ?? existing?.ownerSecret,
  }

  memoryStore.set(key, record)

  if (!process.env.DATABASE_URL) return

  try {
    const sql = getDb()
    await sql`
      INSERT INTO push_subscriptions (endpoint, wallet_address, subscription, preferences, owner_secret, registered_at, updated_at)
      VALUES (${key}, ${normalizedWallet}, ${JSON.stringify(subscription)}, ${preferences ? JSON.stringify(preferences) : null}, ${ownerSecret ?? record.ownerSecret}, ${new Date(record.registeredAt)}, NOW())
      ON CONFLICT (endpoint) DO UPDATE SET
        wallet_address = EXCLUDED.wallet_address,
        subscription = EXCLUDED.subscription,
        preferences = EXCLUDED.preferences,
        owner_secret = EXCLUDED.owner_secret,
        updated_at = NOW()
    `
  } catch (error) {
    logger.warn("[subscriptionStore] Failed to persist subscription to database", error)
  }
}

/**
 * Removes a subscription by endpoint URL.
 */
export async function removeSubscription(endpoint: string): Promise<void> {
  const key = endpointKey(endpoint)
  memoryStore.delete(key)

  if (!process.env.DATABASE_URL) return

  try {
    const sql = getDb()
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ${key}`
  } catch (error) {
    logger.warn("[subscriptionStore] Failed to delete subscription from database", error)
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

  if (!process.env.DATABASE_URL) return

  try {
    const sql = getDb()
    await sql`DELETE FROM push_subscriptions WHERE wallet_address = ${target}`
  } catch (error) {
    logger.warn("[subscriptionStore] Failed to delete subscriptions from database", error)
  }
}

// ─── Query ────────────────────────────────────────────────────────────

/**
 * Returns all subscriptions for a given wallet address.
 */
export async function getSubscriptionsForWallet(
  walletAddress: string
): Promise<WebPushSubscriptionRecord[]> {
  const target = walletKey(walletAddress)
  await hydrateStore()
  return [...memoryStore.values()].filter((r) => r.walletAddress === target)
}

/**
 * Returns all subscriptions for a list of wallet addresses.
 */
export async function getSubscriptionsByWallets(
  walletAddresses: string[]
): Promise<WebPushSubscriptionRecord[]> {
  const targets = new Set(walletAddresses.map((w) => walletKey(w)))
  await hydrateStore()
  return [...memoryStore.values()].filter((r) => targets.has(r.walletAddress))
}

/**
 * Returns all stored subscription records (admin / diagnostics use only).
 */
export async function getAllSubscriptions(): Promise<WebPushSubscriptionRecord[]> {
  await hydrateStore()
  return [...memoryStore.values()]
}

/**
 * Returns the total number of stored subscriptions.
 */
export async function getSubscriptionCount(): Promise<number> {
  await hydrateStore()
  return memoryStore.size
}

/**
 * Returns the owner secret for a given endpoint, if stored.
 */
export async function getOwnerSecret(endpoint: string): Promise<string | undefined> {
  const key = endpointKey(endpoint)
  await hydrateStore()
  return memoryStore.get(key)?.ownerSecret
}

/**
 * Returns the owner secret for a given wallet address, if stored.
 * Wallets can have multiple endpoints (devices); they share one owner secret.
 */
export async function getOwnerSecretForWallet(
  walletAddress: string
): Promise<string | undefined> {
  const target = walletKey(walletAddress)
  await hydrateStore()
  const record = [...memoryStore.values()].find((r) => r.walletAddress === target)
  return record?.ownerSecret
}

/**
 * Resets process-local state in unit tests or during a development reset.
 */
export function clearSubscriptionStore(): void {
  memoryStore.clear()
  storeHydrated = false
}
