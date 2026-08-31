/**
 * Canonical absolute base URL for the Hunty web app.
 *
 * Mirrors the convention already used in app/sitemap.ts:
 *   process.env.NEXT_PUBLIC_BASE_URL || "https://hunty.app"
 *
 * Centralised here so OG image routes, the public leaderboard page,
 * the embed widget, and the share UI all resolve the same absolute
 * origin. Absolute URLs are required for Open Graph `images`, iframe
 * `src` attributes, and copy-paste share links — relative paths break
 * when rendered by crawlers or embedded on third-party origins.
 */

/** Fallback origin used when NEXT_PUBLIC_BASE_URL is not configured. */
export const DEFAULT_BASE_URL = "https://hunty.app"

/**
 * Returns the site's absolute base URL with no trailing slash.
 *
 * @example
 *   getBaseUrl() // "https://hunty.app"
 *   getBaseUrl("/leaderboard/1") // "https://hunty.app/leaderboard/1"
 */
export function getBaseUrl(path = ""): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_BASE_URL
  const base = raw.replace(/\/+$/, "")

  if (!path) return base

  const suffix = path.startsWith("/") ? path : `/${path}`
  return `${base}${suffix}`
}