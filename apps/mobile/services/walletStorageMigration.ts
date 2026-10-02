/**
 * Wallet & Sensitive Storage Migration Service
 *
 * Enforces security boundaries:
 * - Wallet sessions, signing material, PIN hashes/salts, and biometric settings
 *   MUST be stored in expo-secure-store.
 * - AsyncStorage MUST NEVER store any private keys, credentials, or session tokens.
 *
 * This module provides automated migration from plaintext AsyncStorage to
 * SecureStore for any sensitive keys left by legacy versions or accidental writes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Registry of all sensitive storage keys that must only reside in SecureStore.
 */
export const SENSITIVE_STORAGE_KEYS = [
  'hunty_wc_session',
  'hunty-wallet',
  'hunty_pin_hash',
  'hunty_pin_salt',
  'hunty_biometric_enabled',
  'hunty_biometric_type',
  'hunty_push_token',
  'hunty_push_token_wallet',
] as const;

export type SensitiveStorageKey = (typeof SENSITIVE_STORAGE_KEYS)[number];

/**
 * Checks whether a given storage key is classified as sensitive.
 */
export function isSensitiveStorageKey(key: string): boolean {
  if ((SENSITIVE_STORAGE_KEYS as readonly string[]).includes(key)) {
    return true;
  }
  const lower = key.toLowerCase();
  return (
    lower.includes('session') ||
    lower.includes('wallet') ||
    lower.includes('private') ||
    lower.includes('secret') ||
    lower.includes('seed') ||
    lower.includes('token') ||
    lower.includes('pin_') ||
    lower.includes('auth')
  );
}

export interface MigrationResult {
  migratedKeys: string[];
  purgedKeys: string[];
}

/**
 * Migrates any sensitive keys that may exist in plaintext AsyncStorage into
 * SecureStore and removes them from AsyncStorage.
 */
export async function migrateSensitiveKeysFromAsyncStorage(): Promise<MigrationResult> {
  const migratedKeys: string[] = [];
  const purgedKeys: string[] = [];

  for (const key of SENSITIVE_STORAGE_KEYS) {
    try {
      const plaintextVal = await AsyncStorage.getItem(key);
      if (plaintextVal !== null && plaintextVal !== undefined) {
        // Check if SecureStore already has a value for this key
        const secureVal = await SecureStore.getItemAsync(key);
        if (!secureVal) {
          await SecureStore.setItemAsync(key, plaintextVal);
          migratedKeys.push(key);
        }
        // Always purge from plaintext AsyncStorage
        await AsyncStorage.removeItem(key);
        purgedKeys.push(key);
      }
    } catch {
      if (__DEV__) {
        console.warn(`[StorageMigration] Failed migrating key: ${key}`);
      }
    }
  }

  return { migratedKeys, purgedKeys };
}

/**
 * Safe wrapper around AsyncStorage.setItem that rejects sensitive keys.
 * Guards against regression where sensitive keys are written to plaintext storage.
 */
export async function safeAsyncStorageSet(key: string, value: string): Promise<void> {
  if (isSensitiveStorageKey(key)) {
    throw new Error(
      `[Security Violation] Sensitive key "${key}" cannot be written to plaintext AsyncStorage. Use SecureStore instead.`,
    );
  }
  await AsyncStorage.setItem(key, value);
}
