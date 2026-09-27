/**
 * Expo push token registration with the Hunty backend.
 *
 * Responsibilities:
 *  - Retrieve the device Expo push token (physical device only).
 *  - Register/update the token against the backend API, associating it with the
 *    authenticated wallet address.
 *  - Persist the registered token locally so we can detect stale tokens and
 *    avoid duplicate round-trips.
 *  - Unregister on wallet disconnect to stop orphaned notifications.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import env from '@config/env';

const PUSH_TOKEN_KEY = 'hunty_push_token';
const PUSH_TOKEN_WALLET_KEY = 'hunty_push_token_wallet';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Read persisted token from secure storage, or null. */
async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Read which wallet the stored token is associated with. */
async function getStoredTokenWallet(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PUSH_TOKEN_WALLET_KEY);
  } catch {
    return null;
  }
}

async function persistToken(token: string, walletAddress: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
    await SecureStore.setItemAsync(PUSH_TOKEN_WALLET_KEY, walletAddress);
  } catch {
    if (__DEV__) console.warn('[TokenRegistry] Failed to persist token');
  }
}

async function clearStoredToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(PUSH_TOKEN_WALLET_KEY);
  } catch {
    // ignore
  }
}

// ─── Token retrieval ─────────────────────────────────────────────────────────

/**
 * Retrieve the Expo push token for this device.
 * Returns null on simulators or when permissions are missing.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    if (__DEV__) console.warn('[TokenRegistry] Push tokens are only available on physical devices');
    return null;
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    if (__DEV__) console.warn('[TokenRegistry] Push permission not granted, skipping token fetch');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenData.data;
  } catch (err) {
    if (__DEV__) console.warn('[TokenRegistry] getExpoPushTokenAsync failed:', err);
    return null;
  }
}

// ─── Backend registration ─────────────────────────────────────────────────────

async function postTokenToBackend(
  token: string,
  walletAddress: string,
  retries = 3,
): Promise<void> {
  const url = `${env.apiUrl}/push-tokens`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, walletAddress }),
      });

      if (res.ok || res.status === 409) {
        // 409 Conflict means token already registered — treat as success
        return;
      }

      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (attempt === retries) {
        if (__DEV__) console.warn(`[TokenRegistry] Backend registration failed after ${retries} attempts:`, err);
        throw err;
      }
      // Exponential back-off: 500ms, 1000ms, 2000ms …
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
}

async function deleteTokenFromBackend(token: string, walletAddress: string): Promise<void> {
  const url = `${env.apiUrl}/push-tokens`;
  try {
    await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, walletAddress }),
    });
  } catch (err) {
    if (__DEV__) console.warn('[TokenRegistry] Token unregister failed:', err);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Register the device push token with the backend for a given wallet address.
 *
 * Skips the backend call if the same token is already registered for the same
 * wallet, preventing duplicate registrations.
 */
export async function registerPushToken(walletAddress: string): Promise<void> {
  if (!walletAddress) return;

  const token = await getExpoPushToken();
  if (!token) return;

  const [storedToken, storedWallet] = await Promise.all([
    getStoredToken(),
    getStoredTokenWallet(),
  ]);

  const alreadyRegistered = storedToken === token && storedWallet === walletAddress;
  if (alreadyRegistered) {
    if (__DEV__) console.log('[TokenRegistry] Token already registered, skipping');
    return;
  }

  try {
    await postTokenToBackend(token, walletAddress);
    await persistToken(token, walletAddress);
    if (__DEV__) console.log('[TokenRegistry] Token registered for', walletAddress);
  } catch {
    // Error already logged inside postTokenToBackend — don't crash the app
  }
}

/**
 * Unregister the device push token when the user disconnects their wallet.
 * Clears local storage regardless of whether the backend call succeeds.
 */
export async function unregisterPushToken(): Promise<void> {
  const [token, wallet] = await Promise.all([getStoredToken(), getStoredTokenWallet()]);

  await clearStoredToken();

  if (token && wallet) {
    await deleteTokenFromBackend(token, wallet);
  }
}
