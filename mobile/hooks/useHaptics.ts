import { useCallback, useRef } from 'react';
import {
  triggerNotification,
  triggerImpact,
  triggerSelection,
  hapticTriggers,
} from '../utils/haptics';
import { useSettingsStore } from '../store/useStore';

interface UseHapticsOptions {
  /** Minimum delay between haptic triggers in milliseconds. Defaults to 150ms. */
  cooldownMs?: number;
}

/**
 * Reusable hook to trigger haptics safely and with built-in physical motor protection.
 * Prevents rapid accidental double-triggers or repeated loop triggers.
 */
export function useHaptics(options: UseHapticsOptions = {}) {
  const { cooldownMs = 150 } = options;
  const lastTriggeredRef = useRef<number>(0);
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);

  /**
   * Internal gate to enforce cooldown rules
   */
  const executeWithCooldown = useCallback(
    (action: () => any) => {
      if (!hapticsEnabled) return;
      const now = Date.now();
      if (now - lastTriggeredRef.current >= cooldownMs) {
        lastTriggeredRef.current = now;
        action();
      }
    },
    [cooldownMs, hapticsEnabled]
  );

  const safeJoinSuccess = useCallback(() => {
    executeWithCooldown(() => hapticTriggers.joinSuccess());
  }, [executeWithCooldown]);

  const safeScanSuccess = useCallback(() => {
    executeWithCooldown(() => hapticTriggers.scanSuccess());
  }, [executeWithCooldown]);

  const safeScanSubtle = useCallback(() => {
    executeWithCooldown(() => hapticTriggers.scanSubtle());
  }, [executeWithCooldown]);

  const safeTaskSuccess = useCallback(() => {
    executeWithCooldown(() => hapticTriggers.taskSuccess());
  }, [executeWithCooldown]);

  const safeRewardHeavy = useCallback(() => {
    executeWithCooldown(() => hapticTriggers.rewardHeavy());
  }, [executeWithCooldown]);

  const safeNotification = useCallback(
    (type: 'success' | 'warning' | 'error') => {
      executeWithCooldown(() => triggerNotification(type));
    },
    [executeWithCooldown]
  );

  const safeImpact = useCallback(
    (style: 'light' | 'medium' | 'heavy') => {
      executeWithCooldown(() => triggerImpact(style));
    },
    [executeWithCooldown]
  );

  const safeSelection = useCallback(() => {
    executeWithCooldown(() => triggerSelection());
  }, [executeWithCooldown]);

  return {
    // Semantic preset triggers
    joinSuccess: safeJoinSuccess,
    scanSuccess: safeScanSuccess,
    scanSubtle: safeScanSubtle,
    taskSuccess: safeTaskSuccess,
    rewardHeavy: safeRewardHeavy,

    // Generic primitives
    triggerNotification: safeNotification,
    triggerImpact: safeImpact,
    triggerSelection: safeSelection,
  };
}
