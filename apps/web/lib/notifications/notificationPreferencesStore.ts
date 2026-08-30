/**
 * Server-side persistence for notification preferences.
 *
 * Preferences are keyed by the connected Stellar wallet, not by a browser
 * device. This is what makes one change visible on a phone, another browser,
 * and the web app.
 */

import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
  type NotificationPreferences,
  type NotificationPreferencesPatch,
} from './types';

const memoryStore = new Map<string, NotificationPreferences>();

function walletKey(walletAddress: string): string {
  return walletAddress.trim().toLowerCase();
}

function clonePreferences(prefs: NotificationPreferences): NotificationPreferences {
  return { ...prefs };
}

/**
 * Read preferences from PostgreSQL when configured. The in-memory fallback is
 * intentional for local development and unit tests; production deployments
 * should configure DATABASE_URL and run migration 010.
 */
export async function getStoredNotificationPreferences(
  walletAddress: string
): Promise<NotificationPreferences> {
  const normalizedWallet = walletKey(walletAddress);
  const fallback = memoryStore.get(normalizedWallet) ?? DEFAULT_NOTIFICATION_PREFERENCES;

  if (!process.env.DATABASE_URL) return clonePreferences(fallback);

  try {
    const sql = getDb();
    const [row] = await sql`
      SELECT preferences FROM notification_preferences
      WHERE wallet_address = ${normalizedWallet}
    `;

    if (!row || row.preferences == null) return clonePreferences(fallback);

    const stored =
      typeof row.preferences === 'string'
        ? (JSON.parse(row.preferences) as NotificationPreferencesPatch)
        : (row.preferences as NotificationPreferencesPatch);
    const preferences = normalizeNotificationPreferences(stored);
    memoryStore.set(normalizedWallet, preferences);
    return clonePreferences(preferences);
  } catch (error) {
    // Do not make the settings screen unusable during a transient database
    // outage. The caller receives the last known local process value and the
    // next successful request will read the canonical database copy.
    logger.warn('Failed to read notification preferences from database', error);
    return clonePreferences(fallback);
  }
}

/** Persist the complete preference document for a wallet. */
export async function saveNotificationPreferences(
  walletAddress: string,
  value: NotificationPreferencesPatch
): Promise<NotificationPreferences> {
  const normalizedWallet = walletKey(walletAddress);
  const preferences = normalizeNotificationPreferences(value);
  memoryStore.set(normalizedWallet, preferences);

  if (!process.env.DATABASE_URL) return clonePreferences(preferences);

  try {
    const sql = getDb();
    await sql`
      INSERT INTO notification_preferences (wallet_address, preferences, updated_at)
      VALUES (${normalizedWallet}, ${JSON.stringify(preferences)}, NOW())
      ON CONFLICT (wallet_address) DO UPDATE SET
        preferences = EXCLUDED.preferences,
        updated_at = NOW()
    `;
  } catch (error) {
    logger.warn('Failed to persist notification preferences to database', error);
    // Keep the in-memory copy so a temporary outage does not discard the
    // user's change. The API still returns the normalized value.
  }

  return clonePreferences(preferences);
}

/** Reset process-local state in unit tests or during a development reset. */
export function clearNotificationPreferencesStore(): void {
  memoryStore.clear();
}
