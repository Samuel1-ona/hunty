/**
 * Wallet session persistence helpers — Issue #189
 *
 * Persists the active WalletConnect SessionInfo to expo-secure-store so that:
 *   1. The UI can restore the last-known session immediately on boot (before the
 *      WalletConnect SDK finishes hydrating its own internal cache).
 *   2. Users are not forced to reconnect after a hard app restart.
 *
 * The persisted payload is intentionally minimal: we only store the topic,
 * publicKey, and network.  The full WalletConnect session (including signing
 * keys) lives in the SDK's own secure storage; we hold no private material.
 *
 * Usage:
 *   import { saveSession, loadSession, clearSession } from '@services/walletSession';
 */

import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'hunty_wc_session';

export interface PersistedSession {
  topic: string;
  publicKey: string;
  network: string;
}

/**
 * Persist a WalletConnect session to secure storage.
 * Silently no-ops on error so a storage failure never breaks the connect flow.
 */
export async function saveSession(session: PersistedSession): Promise<void> {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  } catch {
    if (__DEV__) console.warn('[WalletSession] saveSession failed');
  }
}

/**
 * Load the last persisted session from secure storage.
 * Returns `null` when nothing is stored or the stored value is malformed.
 */
export async function loadSession(): Promise<PersistedSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed.topic || !parsed.publicKey) return null;
    return parsed;
  } catch {
    if (__DEV__) console.warn('[WalletSession] loadSession failed');
    return null;
  }
}

/**
 * Remove the persisted session from secure storage (call on disconnect).
 * Silently no-ops on error.
 */
export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    if (__DEV__) console.warn('[WalletSession] clearSession failed');
  }
}
