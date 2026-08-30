/**
 * Countdown / live hunt status utilities (server-synced aware).
 */

import { getCountdown } from '@/lib/dateUtils';
import { getServerSyncedNowSeconds } from '@/lib/serverTime';

export type HuntLiveStatus = 'scheduled' | 'live' | 'ending_soon' | 'ended' | 'unknown';

export interface CountdownParts {
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Formatted string e.g. "1d 02h 15m 03s" */
  label: string;
  expired: boolean;
}

export type TimeWarningLevel = 'none' | 'caution' | 'warning' | 'critical' | 'expired';

/** Default warning thresholds in seconds remaining. */
export const DEFAULT_WARNING_THRESHOLDS = {
  caution: 30 * 60, // 30m
  warning: 5 * 60, // 5m
  critical: 60, // 1m
} as const;

export function getCountdownParts(
  targetUnixSeconds: number,
  nowUnixSeconds: number = getServerSyncedNowSeconds()
): CountdownParts {
  let diff = targetUnixSeconds - nowUnixSeconds;
  if (diff <= 0) {
    return {
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      label: '0s',
      expired: true,
    };
  }

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours.toString().padStart(days > 0 ? 2 : 1, '0')}h`);
  parts.push(`${minutes.toString().padStart(2, '0')}m`);
  parts.push(`${seconds.toString().padStart(2, '0')}s`);

  return {
    totalSeconds: diff,
    days,
    hours,
    minutes,
    seconds,
    label: parts.join(' '),
    expired: false,
  };
}

export function getTimeWarningLevel(
  remainingSeconds: number,
  thresholds = DEFAULT_WARNING_THRESHOLDS
): TimeWarningLevel {
  if (remainingSeconds <= 0) return 'expired';
  if (remainingSeconds <= thresholds.critical) return 'critical';
  if (remainingSeconds <= thresholds.warning) return 'warning';
  if (remainingSeconds <= thresholds.caution) return 'caution';
  return 'none';
}

export function resolveHuntLiveStatus(opts: {
  startTime?: number;
  endTime?: number;
  now?: number;
  endingSoonSeconds?: number;
}): HuntLiveStatus {
  const now = opts.now ?? getServerSyncedNowSeconds();
  const endingSoon = opts.endingSoonSeconds ?? 15 * 60;

  if (opts.endTime != null && now >= opts.endTime) return 'ended';
  if (opts.startTime != null && now < opts.startTime) return 'scheduled';
  if (opts.endTime != null && opts.endTime - now <= endingSoon) return 'ending_soon';
  if (
    (opts.startTime == null || now >= opts.startTime) &&
    (opts.endTime == null || now < opts.endTime)
  ) {
    return 'live';
  }
  return 'unknown';
}

/** Human label for start countdown (falls back to getCountdown string). */
export function getStartCountdownLabel(
  startTime: number,
  now: number = getServerSyncedNowSeconds()
): string | null {
  if (now >= startTime) return null;
  return getCountdownParts(startTime, now).label;
}

/** Re-export getCountdown for convenience with optional now override via parts. */
export { getCountdown };
