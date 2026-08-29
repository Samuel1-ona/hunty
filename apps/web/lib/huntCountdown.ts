/**
 * Countdown / live hunt status utilities (server-synced aware).
 *
 * `getCountdownParts` now accepts an optional `units` map (CountdownUnits)
 * so callers can pass locale-translated unit labels from `next-intl` messages.
 * Falls back to the English defaults ("d", "h", "m", "s") for backward-compat.
 */

import { getCountdown } from "@/lib/dateUtils"
import { buildCountdownLabel, type CountdownUnits, DEFAULT_COUNTDOWN_UNITS } from "@/lib/i18n-datetime"
import { getServerSyncedNowSeconds } from "@/lib/serverTime"

export type HuntLiveStatus =
  | "scheduled"
  | "live"
  | "ending_soon"
  | "ended"
  | "unknown"

export interface CountdownParts {
  totalSeconds: number
  days: number
  hours: number
  minutes: number
  seconds: number
  /** Formatted string e.g. "1d 02h 15m 03s" – uses supplied locale units */
  label: string
  expired: boolean
}

export type TimeWarningLevel = "none" | "caution" | "warning" | "critical" | "expired"

/** Default warning thresholds in seconds remaining. */
export const DEFAULT_WARNING_THRESHOLDS = {
  caution: 30 * 60, // 30m
  warning: 5 * 60,  // 5m
  critical: 60,     // 1m
} as const

// Re-export so consumers can type the units map without importing i18n-datetime.
export type { CountdownUnits }
export { DEFAULT_COUNTDOWN_UNITS }

export function getCountdownParts(
  targetUnixSeconds: number,
  nowUnixSeconds: number = getServerSyncedNowSeconds(),
  units: CountdownUnits = DEFAULT_COUNTDOWN_UNITS,
): CountdownParts {
  let diff = targetUnixSeconds - nowUnixSeconds
  if (diff <= 0) {
    return {
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      label: `0${units.s}`,
      expired: true,
    }
  }

  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = diff % 60

  return {
    totalSeconds: diff,
    days,
    hours,
    minutes,
    seconds,
    label: buildCountdownLabel({ days, hours, minutes, seconds }, units),
    expired: false,
  }
}

export function getTimeWarningLevel(
  remainingSeconds: number,
  thresholds = DEFAULT_WARNING_THRESHOLDS,
): TimeWarningLevel {
  if (remainingSeconds <= 0) return "expired"
  if (remainingSeconds <= thresholds.critical) return "critical"
  if (remainingSeconds <= thresholds.warning) return "warning"
  if (remainingSeconds <= thresholds.caution) return "caution"
  return "none"
}

export function resolveHuntLiveStatus(opts: {
  startTime?: number
  endTime?: number
  now?: number
  endingSoonSeconds?: number
}): HuntLiveStatus {
  const now = opts.now ?? getServerSyncedNowSeconds()
  const endingSoon = opts.endingSoonSeconds ?? 15 * 60

  if (opts.endTime != null && now >= opts.endTime) return "ended"
  if (opts.startTime != null && now < opts.startTime) return "scheduled"
  if (opts.endTime != null && opts.endTime - now <= endingSoon) return "ending_soon"
  if (
    (opts.startTime == null || now >= opts.startTime) &&
    (opts.endTime == null || now < opts.endTime)
  ) {
    return "live"
  }
  return "unknown"
}

/** Human label for start countdown (falls back to getCountdown string). */
export function getStartCountdownLabel(
  startTime: number,
  now: number = getServerSyncedNowSeconds(),
  units?: CountdownUnits,
): string | null {
  if (now >= startTime) return null
  return getCountdownParts(startTime, now, units).label
}

/** Re-export getCountdown for convenience with optional now override via parts. */
export { getCountdown }
