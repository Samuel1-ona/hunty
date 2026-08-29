/**
 * Notification preferences for Hunty Mobile.
 *
 * The local copy keeps the app usable offline. When a wallet address is
 * supplied, reads and writes also use the wallet-scoped v1 API so the same
 * category choices are available on every device.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import env from '@config/env';

import type { NotificationEventType } from './types';

const PREFS_KEY = 'hunty_notification_prefs';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  /** Master toggle — when false, all notifications are suppressed. */
  enabled: boolean;
  /** Hunt lifecycle events (hunt_start, hunt_ending_soon). */
  huntEvents: boolean;
  /** Reward and progress events (reward, correct_answer). */
  rewards: boolean;
  /** Social / competitive events (leaderboard_outranked). */
  social: boolean;
  /** Achievement unlocked events. */
  achievements: boolean;
}

/** Default preferences — everything enabled. */
export const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  huntEvents: true,
  rewards: true,
  social: true,
  achievements: true,
};

const PREFERENCES_ENDPOINT = `${env.apiUrl}/v1/notifications/preferences`;

function normalizePreferences(
  value: Partial<NotificationPreferences> | null | undefined,
): NotificationPreferences {
  const input = value ?? {};
  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : DEFAULT_PREFERENCES.enabled,
    huntEvents:
      typeof input.huntEvents === 'boolean' ? input.huntEvents : DEFAULT_PREFERENCES.huntEvents,
    rewards: typeof input.rewards === 'boolean' ? input.rewards : DEFAULT_PREFERENCES.rewards,
    social: typeof input.social === 'boolean' ? input.social : DEFAULT_PREFERENCES.social,
    achievements:
      typeof input.achievements === 'boolean'
        ? input.achievements
        : DEFAULT_PREFERENCES.achievements,
  };
}

async function getLocalPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    return normalizePreferences(JSON.parse(raw) as Partial<NotificationPreferences>);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

async function persistLocalPreferences(prefs: NotificationPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    if (__DEV__) console.warn('[NotificationPreferences] Failed to save preferences');
  }
}

/** Retrieve the saved preferences, optionally hydrating from the wallet API. */
export async function getPreferences(walletAddress?: string): Promise<NotificationPreferences> {
  const local = await getLocalPreferences();
  if (!walletAddress) return local;

  try {
    const response = await fetch(
      `${PREFERENCES_ENDPOINT}?walletAddress=${encodeURIComponent(walletAddress)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!response.ok) return local;

    const body = (await response.json()) as {
      preferences?: Partial<NotificationPreferences>;
    };
    if (!body.preferences) return local;

    const serverPreferences = normalizePreferences(body.preferences);
    await persistLocalPreferences(serverPreferences);
    return serverPreferences;
  } catch {
    // Offline or an unavailable API should not prevent local notifications.
    return local;
  }
}

/**
 * Persist notification preferences locally and, when a wallet is supplied,
 * sync the complete category document to the server.
 */
export async function setPreferences(
  prefs: NotificationPreferences,
  walletAddress?: string,
): Promise<void> {
  const normalized = normalizePreferences(prefs);
  await persistLocalPreferences(normalized);

  if (!walletAddress) return;

  try {
    await fetch(PREFERENCES_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, preferences: normalized }),
    });
  } catch {
    // The local value remains available and will be retried on the next edit.
  }
}

// ─── Mapping from event type to preference category ───────────────────────────

const EVENT_TO_CATEGORY: Record<
  NotificationEventType,
  keyof Omit<NotificationPreferences, 'enabled'>
> = {
  hunt_start: 'huntEvents',
  hunt_ending_soon: 'huntEvents',
  reward: 'rewards',
  correct_answer: 'rewards',
  leaderboard_outranked: 'social',
  achievement: 'achievements',
};

// ─── Public filtering API ─────────────────────────────────────────────────────

/**
 * Check whether a notification of the given type should be shown.
 * Unknown event types are rejected defensively.
 */
export async function shouldShowNotification(type: string): Promise<boolean> {
  const prefs = await getPreferences();

  if (!prefs.enabled) return false;

  const category = EVENT_TO_CATEGORY[type as NotificationEventType];
  if (!category) return false;

  return prefs[category];
}
