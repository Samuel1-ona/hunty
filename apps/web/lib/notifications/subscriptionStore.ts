/**
 * In-memory push subscription store.
 *
 * Stores the full PushSubscription JSON alongside the user's wallet address
 * and their push notification preferences, so the server can respect per-user
 * opt-in flags without needing to access client-side localStorage.
 *
 * Server-side only — do not import from client components.
 */

import type { WebPushSubscriptionRecord } from './types';

/** Keyed by subscription endpoint for O(1) deduplication and removal. */
const store = new Map<string, WebPushSubscriptionRecord>();

// ─── Mutation ─────────────────────────────────────────────────────────────────

/**
 * Adds or updates a push subscription for the given wallet address.
 * Optionally stores the user's per-type preference flags so the server
 * can filter before sending.
 */
export function upsertSubscription(
  subscription: PushSubscriptionJSON,
  walletAddress: string,
  preferences?: WebPushSubscriptionRecord['preferences']
): void {
  if (!subscription.endpoint) return;

  const existing = store.get(subscription.endpoint);
  store.set(subscription.endpoint, {
    subscription,
    walletAddress: walletAddress.toLowerCase(),
    registeredAt: existing?.registeredAt ?? Date.now(),
    preferences: preferences ?? existing?.preferences,
  });
}

/**
 * Removes a subscription by endpoint URL.
 */
export function removeSubscription(endpoint: string): void {
  store.delete(endpoint);
}

/**
 * Removes all subscriptions for a wallet address.
 */
export function removeSubscriptionsForWallet(walletAddress: string): void {
  const target = walletAddress.toLowerCase();
  for (const [endpoint, record] of store) {
    if (record.walletAddress === target) {
      store.delete(endpoint);
    }
  }
}

// ─── Query ────────────────────────────────────────────────────────────────────

/**
 * Returns all subscriptions for a given wallet address.
 */
export function getSubscriptionsForWallet(walletAddress: string): WebPushSubscriptionRecord[] {
  const target = walletAddress.toLowerCase();
  return [...store.values()].filter((r) => r.walletAddress === target);
}

/**
 * Returns all subscriptions for a list of wallet addresses.
 */
export function getSubscriptionsByWallets(walletAddresses: string[]): WebPushSubscriptionRecord[] {
  const targets = new Set(walletAddresses.map((w) => w.toLowerCase()));
  return [...store.values()].filter((r) => targets.has(r.walletAddress));
}

/**
 * Returns all stored subscription records (admin / diagnostics use only).
 */
export function getAllSubscriptions(): WebPushSubscriptionRecord[] {
  return [...store.values()];
}

/**
 * Returns the total number of stored subscriptions.
 */
export function getSubscriptionCount(): number {
  return store.size;
}
