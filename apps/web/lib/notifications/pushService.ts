/**
 * Server-side Web Push notification service.
 *
 * Uses the `web-push` library to send VAPID-authenticated push messages to
 * stored PushSubscription endpoints.
 *
 * Only import this module in server-side code (API routes, Server Actions).
 */

import webpush, { type PushSubscription as WebPushSubscription } from 'web-push';
import { logger } from '@/lib/logger';
import type { PushEventType, PushPayload, WebPushSubscriptionRecord } from './types';
import { PUSH_EVENT_PREFERENCE_KEY } from './types';
import {
  getSubscriptionsForWallet,
  getSubscriptionsByWallets,
  removeSubscription,
} from './subscriptionStore';

// ─── VAPID Configuration ──────────────────────────────────────────────────────

let vapidConfigured = false;

function ensureVapidConfigured(): void {
  if (vapidConfigured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@hunty.app';

  if (!publicKey || !privateKey) {
    logger.warn(
      '[pushService] VAPID keys not configured — push notifications will be skipped. ' +
        'Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your environment.'
    );
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

// ─── Payload Builders ─────────────────────────────────────────────────────────

export function buildPayload(
  type: PushEventType,
  context: Record<string, string | number>
): PushPayload {
  const huntName = String(context.huntName ?? 'a hunt');
  const overtakerName = String(context.overtakerName ?? 'another player');
  const playerName = String(context.playerName ?? 'A player');
  const huntId = context.huntId;

  switch (type) {
    case 'hunt_start':
      return {
        title: '🚀 Hunt is Live!',
        body: `"${huntName}" has just started. Race to the top!`,
        tag: `hunt-start-${huntId}`,
        url: huntId ? `/hunt/${huntId}` : '/',
        data: { type, huntId },
      };

    case 'hunt_cancelled':
      return {
        title: '❌ Hunt Cancelled',
        body: `"${huntName}" has been cancelled by the creator.`,
        tag: `hunt-cancelled-${huntId}`,
        url: '/',
        data: { type, huntId },
      };

    case 'leaderboard_overtake':
      return {
        title: "⚡ You've Been Overtaken!",
        body: `${overtakerName} just passed you in "${huntName}". Fight back!`,
        tag: `overtake-${huntId}`,
        url: huntId ? `/hunt/${huntId}` : '/',
        data: { type, huntId },
      };

    case 'player_registered':
      return {
        title: '🎉 New Player Joined!',
        body: `${playerName} just registered for your hunt "${huntName}".`,
        tag: `player-registered-${huntId}-${Date.now()}`,
        url: huntId ? `/dashboard` : '/dashboard',
        data: { type, huntId },
      };

    case 'first_completion':
      return {
        title: '🏆 First Completion!',
        body: `${playerName} is the first to complete your hunt "${huntName}"!`,
        tag: `first-completion-${huntId}`,
        url: `/dashboard`,
        data: { type, huntId },
      };

    default:
      return {
        title: 'Hunty',
        body: 'You have a new notification.',
        tag: `hunty-${Date.now()}`,
        url: '/',
      };
  }
}

// ─── Send Helpers ─────────────────────────────────────────────────────────────

/**
 * Sends a push notification to all subscriptions for a wallet address.
 * Stale / expired subscriptions are automatically pruned.
 * Per-recipient preferences are respected.
 */
export async function sendPushToWallet(
  walletAddress: string,
  payload: PushPayload,
  eventType?: PushEventType
): Promise<void> {
  ensureVapidConfigured();
  if (!vapidConfigured) return;

  const records = getSubscriptionsForWallet(walletAddress);
  if (records.length === 0) return;

  await sendToRecords(records, payload, eventType);
}

/**
 * Sends a push notification to all subscriptions for a list of wallet
 * addresses (e.g., all registered players for a hunt).
 * Per-recipient preferences are respected.
 */
export async function sendPushToWallets(
  walletAddresses: string[],
  payload: PushPayload,
  eventType?: PushEventType
): Promise<void> {
  ensureVapidConfigured();
  if (!vapidConfigured) return;

  const records = getSubscriptionsByWallets(walletAddresses);
  if (records.length === 0) return;

  await sendToRecords(records, payload, eventType);
}

/**
 * Builds the payload for the given event type and sends it to the target wallet.
 */
export async function notifyWallet(
  walletAddress: string,
  type: PushEventType,
  context: Record<string, string | number>
): Promise<void> {
  const payload = buildPayload(type, context);
  await sendPushToWallet(walletAddress, payload, type);
}

/**
 * Builds the payload for the given event type and sends it to multiple wallets.
 */
export async function notifyWallets(
  walletAddresses: string[],
  type: PushEventType,
  context: Record<string, string | number>
): Promise<void> {
  const payload = buildPayload(type, context);
  await sendPushToWallets(walletAddresses, payload, type);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function sendToRecords(
  records: WebPushSubscriptionRecord[],
  payload: PushPayload,
  eventType?: PushEventType
): Promise<void> {
  // Filter by per-recipient preferences when we know the event type
  const eligible = eventType
    ? records.filter((r) => {
        const prefs = r.preferences;
        if (!prefs) return true; // no stored prefs → allow (default opt-in)
        const key = PUSH_EVENT_PREFERENCE_KEY[eventType];
        const flag = prefs[key];
        return flag !== false; // undefined → allow, false → skip
      })
    : records;

  if (eligible.length === 0) return;

  const jsonPayload = JSON.stringify(payload);

  const results = await Promise.allSettled(
    eligible.map((record) =>
      webpush
        .sendNotification(record.subscription as WebPushSubscription, jsonPayload)
        .catch((err: { statusCode?: number }) => {
          // 410 Gone / 404 Not Found → subscription is expired, remove it
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            removeSubscription(record.subscription.endpoint as string);
            logger.info('[pushService] Removed stale subscription:', record.walletAddress);
          }
          throw err;
        })
    )
  );

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    logger.warn(`[pushService] ${failures.length}/${eligible.length} push notifications failed`);
  }
}
