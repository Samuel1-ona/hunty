/**
 * Notification preferences for Hunty Mobile.
 *
 * Stores per-category notification preferences in AsyncStorage. Each category
 * maps to one or more NotificationEventType values. The preferences are checked
 * by the NotificationsProvider before displaying a foreground notification.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
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

// ─── Mapping from event type to preference category ───────────────────────────

const EVENT_TO_CATEGORY: Record<NotificationEventType, keyof Omit<NotificationPreferences, 'enabled'>> = {
  hunt_start: 'huntEvents',
  hunt_ending_soon: 'huntEvents',
  reward: 'rewards',
  correct_answer: 'rewards',
  leaderboard_outranked: 'social',
  achievement: 'achievements',
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Retrieve the saved notification preferences, falling back to defaults.
 */
export async function getPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };

    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

/**
 * Persist notification preferences.
 */
export async function setPreferences(prefs: NotificationPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    if (__DEV__) console.warn('[NotificationPreferences] Failed to save preferences');
  }
}

/**
 * Check whether a notification of the given type should be shown, based on the
 * user's saved preferences.
 *
 * Returns false if:
 *  - The master toggle is off.
 *  - The category for the given type is disabled.
 *  - The event type is unknown (defensive fallback).
 */
export async function shouldShowNotification(type: string): Promise<boolean> {
  const prefs = await getPreferences();

  if (!prefs.enabled) return false;

  const category = EVENT_TO_CATEGORY[type as NotificationEventType];
  if (!category) return false;

  return prefs[category];
}
