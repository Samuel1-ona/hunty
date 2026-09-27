/**
 * Badge count management for Hunty Mobile.
 *
 * Tracks the app icon badge count using expo-notifications and persists the
 * count in AsyncStorage so it survives app restarts. The badge is incremented
 * when a notification arrives in the background and reset when the user opens
 * the app.
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BADGE_COUNT_KEY = 'hunty_badge_count';

/**
 * Read the current badge count from local storage.
 * Returns 0 if no value is stored or the stored value is invalid.
 */
export async function getBadgeCount(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(BADGE_COUNT_KEY);
    if (stored === null) return 0;
    const parsed = parseInt(stored, 10);
    return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
  } catch {
    return 0;
  }
}

/**
 * Increment the badge count by 1 and update the app icon badge.
 */
export async function incrementBadge(): Promise<number> {
  const current = await getBadgeCount();
  const next = current + 1;

  try {
    await AsyncStorage.setItem(BADGE_COUNT_KEY, String(next));
    await Notifications.setBadgeCountAsync(next);
  } catch {
    if (__DEV__) console.warn('[BadgeService] Failed to update badge count');
  }

  return next;
}

/**
 * Reset the badge count to 0 and clear the app icon badge.
 * Call this when the user foregrounds the app.
 */
export async function resetBadge(): Promise<void> {
  try {
    await AsyncStorage.setItem(BADGE_COUNT_KEY, '0');
    await Notifications.setBadgeCountAsync(0);
  } catch {
    if (__DEV__) console.warn('[BadgeService] Failed to reset badge count');
  }
}
