/**
 * Date/time formatting utilities.
 * Converts Unix timestamps (seconds) from the contract into readable strings
 * using the browser's Intl.DateTimeFormat for automatic locale/timezone handling.
 */

/**
 * Format a Unix timestamp (seconds) into a readable local date+time string.
 * Example: "Feb 10, 2026, 2:32 PM"
 */
export function formatTimestamp(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000)
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

/**
 * Format a Unix timestamp (seconds) into a short date string.
 * Example: "Feb 10, 2026"
 */
export function formatDate(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000)
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

/**
 * Format an ISO 8601 string into a readable local date+time string.
 * Example: "Feb 10, 2026, 2:32 PM"
 */
export function formatISOString(isoString: string): string {
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return isoString
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

/**
 * Compute a human-readable countdown string from now until a target Unix
 * timestamp (seconds). Returns null if the deadline has passed.
 *
 * Examples: "2h 15m 03s", "45m 12s", "30s"
 */
export function getCountdown(endUnixSeconds: number): string | null {
  const now = Math.floor(Date.now() / 1000)
  let diff = endUnixSeconds - now
  
  // Clamp to zero - if time has elapsed, return null
  if (diff <= 0) return null
  
  // Additional safety: ensure diff is never negative in calculations
  diff = Math.max(0, diff)

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
