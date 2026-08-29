/**
 * Date/time formatting utilities.
 * Converts Unix timestamps (seconds) from the contract into readable strings.
 *
 * All functions delegate to `lib/i18n-datetime` which uses `Intl.DateTimeFormat`
 * under the hood. An optional `locale` (BCP 47 tag) and `timeZone` (IANA name)
 * can be passed; they default to the runtime locale / system timezone so
 * existing call-sites remain fully backward-compatible.
 */

import {
  formatDateI18n,
  formatISOStringI18n,
  formatTimestampI18n,
  formatTimestampWithTimezoneI18n,
  getRemainingSeconds,
} from "@/lib/i18n-datetime"

export {
  formatDateI18n,
  formatISOStringI18n,
  formatNumberI18n,
  formatTimestampI18n,
  formatTimestampWithTimezoneI18n,
  getRemainingSeconds,
} from "@/lib/i18n-datetime"

// ---------------------------------------------------------------------------
// Backward-compatible wrappers (locale defaults to undefined → runtime locale)
// ---------------------------------------------------------------------------

/**
 * Format a Unix timestamp (seconds) into a readable local date+time string.
 * Example: "Feb 10, 2026, 2:32 PM"
 *
 * @param locale Optional BCP 47 locale tag (e.g. "en", "es", "fr").
 */
export function formatTimestamp(
  unixSeconds: number,
  locale?: string,
): string {
  return formatTimestampI18n(unixSeconds, locale)
}

/**
 * Format a Unix timestamp (seconds) into a date+time string with the short
 * timezone abbreviation appended.
 * Example: "Feb 10, 2026, 2:32 PM EST"
 *
 * @param locale Optional BCP 47 locale tag.
 * @param timeZone Optional IANA timezone string.
 */
export function formatTimestampWithTimezone(
  unixSeconds: number,
  locale?: string,
  timeZone?: string,
): string {
  return formatTimestampWithTimezoneI18n(unixSeconds, locale, timeZone)
}

/**
 * Format a Unix timestamp (seconds) into a short date string.
 * Example: "Feb 10, 2026"
 *
 * @param locale Optional BCP 47 locale tag.
 */
export function formatDate(unixSeconds: number, locale?: string): string {
  return formatDateI18n(unixSeconds, locale)
}

/**
 * Format an ISO 8601 string into a readable local date+time string.
 * Returns the original string unchanged if it cannot be parsed.
 *
 * @param locale Optional BCP 47 locale tag.
 */
export function formatISOString(isoString: string, locale?: string): string {
  return formatISOStringI18n(isoString, locale)
}

// ---------------------------------------------------------------------------
// Countdown (locale-neutral seconds arithmetic)
// ---------------------------------------------------------------------------

/**
 * Compute a human-readable countdown string from now until a target Unix
 * timestamp (seconds). Returns null if the deadline has passed.
 *
 * Uses UTC-second arithmetic so DST transitions are transparent.
 * Examples: "2h 15m 03s", "45m 12s", "30s"
 */
export function getCountdown(endUnixSeconds: number): string | null {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const diff = getRemainingSeconds(endUnixSeconds, nowSeconds)

  if (diff <= 0) return null

  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = diff % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  parts.push(`${seconds.toString().padStart(2, "0")}s`)

  return parts.join(" ")
}
