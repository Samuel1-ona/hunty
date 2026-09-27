/**
 * Locale-aware date, time, and number formatting utilities.
 *
 * All functions accept an optional BCP 47 `locale` tag (e.g. "en", "es", "fr")
 * and an optional IANA `timeZone` string (e.g. "America/New_York").
 * When omitted the runtime locale / system timezone is used, which mirrors the
 * previous behaviour in dateUtils.ts while enabling explicit overrides in tests
 * and in locale-aware UI components.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CountdownUnits {
  d: string /** unit label for days    (e.g. "d" / "j" / "d") */
  h: string /** unit label for hours   (e.g. "h" / "h" / "h") */
  m: string /** unit label for minutes (e.g. "m" / "m" / "m") */
  s: string /** unit label for seconds (e.g. "s" / "s" / "s") */
}

/** English fallback used when no locale messages are supplied. */
export const DEFAULT_COUNTDOWN_UNITS: CountdownUnits = {
  d: "d",
  h: "h",
  m: "m",
  s: "s",
}

// ---------------------------------------------------------------------------
// Date / time formatters
// ---------------------------------------------------------------------------

/**
 * Format a Unix timestamp (seconds) into a readable locale date + time string.
 * Example: "Feb 10, 2026, 2:32 PM" (en) / "10 feb 2026, 14:32" (es)
 */
export function formatTimestampI18n(
  unixSeconds: number,
  locale?: string,
  timeZone?: string,
): string {
  const date = new Date(unixSeconds * 1000)
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(date)
}

/**
 * Format a Unix timestamp (seconds) into a short locale date string.
 * Example: "Feb 10, 2026" (en) / "10 feb 2026" (es)
 */
export function formatDateI18n(
  unixSeconds: number,
  locale?: string,
  timeZone?: string,
): string {
  const date = new Date(unixSeconds * 1000)
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(timeZone ? { timeZone } : {}),
  }).format(date)
}

/**
 * Format an ISO 8601 string into a readable locale date + time string.
 * Returns the original string unchanged if it cannot be parsed.
 */
export function formatISOStringI18n(
  isoString: string,
  locale?: string,
  timeZone?: string,
): string {
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return isoString
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(date)
}

/**
 * Format a Unix timestamp (seconds) into a locale date+time string with a
 * short timezone abbreviation appended.
 * Example: "Feb 10, 2026, 2:32 PM EST"
 */
export function formatTimestampWithTimezoneI18n(
  unixSeconds: number,
  locale?: string,
  timeZone?: string,
): string {
  const date = new Date(unixSeconds * 1000)
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    ...(timeZone ? { timeZone } : {}),
  }
  const fmt = new Intl.DateTimeFormat(locale, opts)
  // Build a clean string: use formatToParts to avoid duplicate TZ appending.
  const parts = fmt.formatToParts(date)
  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value ?? ""
  const withoutTz = parts
    .filter((p) => p.type !== "timeZoneName")
    .map((p) => p.value)
    .join("")
    .replace(/,\s*$/, "") // strip trailing comma/space before the missing TZ
    .trim()
  return tzPart ? `${withoutTz} ${tzPart}` : withoutTz
}

// ---------------------------------------------------------------------------
// Number formatter
// ---------------------------------------------------------------------------

/**
 * Format a number according to the active locale.
 * Example: 1234567.89 → "1,234,567.89" (en) / "1.234.567,89" (es)
 */
export function formatNumberI18n(
  value: number,
  locale?: string,
  opts?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, opts).format(value)
}

// ---------------------------------------------------------------------------
// Countdown label builder
// ---------------------------------------------------------------------------

/**
 * Build a human-readable countdown label from pre-computed parts and a units map.
 * The units map is typically sourced from the active locale messages
 * (`messages.dateTime.d`, `.h`, `.m`, `.s`) so the output is fully translated.
 *
 * Examples:
 *   buildCountdownLabel({ days:1, hours:2, minutes:3, seconds:4 }, en)
 *   → "1d 02h 03m 04s"
 *
 *   buildCountdownLabel({ days:0, hours:0, minutes:5, seconds:30 }, es)
 *   → "05m 30s"  (with whatever unit strings the caller passes)
 */
export function buildCountdownLabel(
  parts: { days: number; hours: number; minutes: number; seconds: number },
  units: CountdownUnits = DEFAULT_COUNTDOWN_UNITS,
): string {
  const { days, hours, minutes, seconds } = parts
  const segments: string[] = []

  if (days > 0) {
    segments.push(`${days}${units.d}`)
  }
  segments.push(
    `${hours.toString().padStart(days > 0 ? 2 : 1, "0")}${units.h}`,
  )
  segments.push(`${minutes.toString().padStart(2, "0")}${units.m}`)
  segments.push(`${seconds.toString().padStart(2, "0")}${units.s}`)

  return segments.join(" ")
}

// ---------------------------------------------------------------------------
// DST-safe countdown diff (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Compute the remaining whole seconds between now and a target Unix timestamp
 * (seconds). Always returns a non-negative integer — DST transitions that push
 * the wall clock forward/back are transparent because we work in UTC seconds.
 *
 * Returns 0 when the deadline has passed.
 */
export function getRemainingSeconds(
  targetUnixSeconds: number,
  nowUnixSeconds: number,
): number {
  return Math.max(0, Math.floor(targetUnixSeconds) - Math.floor(nowUnixSeconds))
}
