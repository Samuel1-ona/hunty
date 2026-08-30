'use client';

import { useEffect, useState } from 'react';

import { getCountdown } from '@/lib/dateUtils';

/**
 * React hook that returns a live countdown string that updates every second.
 * Returns null when the deadline has passed.
 *
 * @param endUnixSeconds - target time as Unix timestamp in seconds
 * @returns A human-readable countdown string while the deadline is upcoming,
 *   or null once the target time has elapsed.
 */
export function useCountdown(endUnixSeconds: number | undefined | null): string | null {
  const [display, setDisplay] = useState<string | null>(() =>
    endUnixSeconds != null ? getCountdown(endUnixSeconds) : null
  );

  useEffect(() => {
    if (endUnixSeconds == null) {
      setDisplay(null);
      return;
    }

    // Immediately compute
    setDisplay(getCountdown(endUnixSeconds));

    const intervalId = setInterval(() => {
      const value = getCountdown(endUnixSeconds);
      setDisplay(value);
      if (value === null) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [endUnixSeconds]);

  return display;
}
