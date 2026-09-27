/**
 * useNotifications hook
 *
 * Exposes permission state and a toggle for the Settings screen.
 * Also drives token registration whenever wallet connection is detected.
 *
 * Usage:
 *   const { enabled, permissionStatus, toggle, registerForWallet } = useNotifications();
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getPermissionStatus,
  requestPermission,
  type PermissionStatus,
} from '@services/notifications/notificationService';
import { registerPushToken, unregisterPushToken } from '@services/notifications/tokenRegistry';

export interface UseNotificationsResult {
  /** Whether push notifications are currently enabled (permission granted). */
  enabled: boolean;
  /** The raw permission status: 'granted' | 'denied' | 'undetermined'. */
  permissionStatus: PermissionStatus;
  /** Loading state while permission check or request is in progress. */
  loading: boolean;
  /**
   * Toggle handler for the settings switch.
   * Requesting permission (value=true) prompts the OS dialog.
   * Disabling (value=false) only updates local state — OS permissions cannot be
   * revoked programmatically; users must visit device settings.
   */
  toggle: (value: boolean) => Promise<void>;
  /**
   * Register the device push token for a given wallet address.
   * Safe to call on every wallet connect — skips the backend call if the token
   * is already registered for the same wallet.
   */
  registerForWallet: (walletAddress: string) => Promise<void>;
  /** Unregister the token (call on wallet disconnect). */
  unregister: () => Promise<void>;
}

export function useNotifications(): UseNotificationsResult {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const [loading, setLoading] = useState(true);

  // Hydrate permission state on mount
  useEffect(() => {
    let cancelled = false;
    getPermissionStatus()
      .then((status) => {
        if (!cancelled) setPermissionStatus(status);
      })
      .catch(() => {
        if (!cancelled) setPermissionStatus('undetermined');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(async (value: boolean) => {
    if (!value) {
      // We can't revoke OS permission — just reflect the current OS state
      const status = await getPermissionStatus();
      setPermissionStatus(status);
      return;
    }

    setLoading(true);
    try {
      const status = await requestPermission();
      setPermissionStatus(status);
    } finally {
      setLoading(false);
    }
  }, []);

  const registerForWallet = useCallback(async (walletAddress: string) => {
    await registerPushToken(walletAddress);
  }, []);

  const unregister = useCallback(async () => {
    await unregisterPushToken();
  }, []);

  return {
    enabled: permissionStatus === 'granted',
    permissionStatus,
    loading,
    toggle,
    registerForWallet,
    unregister,
  };
}
