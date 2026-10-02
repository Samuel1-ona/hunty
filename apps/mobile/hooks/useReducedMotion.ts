/**
 * useReducedMotion — Issue #1417
 *
 * Tracks the OS "reduce motion" accessibility setting so animated UI (skeleton
 * shimmer, feed image transitions, …) can be disabled or shortened for users
 * who ask for less motion.
 *
 * The value starts from `AccessibilityInfo.isReduceMotionEnabled()` and is kept
 * in sync through the `reduceMotionChanged` event. The subscription is removed
 * on unmount, and platforms / older React Native versions that do not expose
 * the listener are handled gracefully (the one-shot query is still used).
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (typeof AccessibilityInfo.isReduceMotionEnabled === 'function') {
      AccessibilityInfo.isReduceMotionEnabled()
        .then((enabled) => {
          if (isMounted) {
            setReduceMotionEnabled(enabled);
          }
        })
        .catch(() => {
          // Some platforms/older RN builds cannot answer the query; keep the
          // default (motion allowed) instead of surfacing an error to the UI.
        });
    }

    // `addEventListener` is missing on some platforms/older RN versions — the
    // initial query above still applies, we just cannot live-update.
    const subscription =
      typeof AccessibilityInfo.addEventListener === 'function'
        ? AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotionEnabled)
        : null;

    return () => {
      isMounted = false;
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  return reduceMotionEnabled;
}
