/**
 * Simple admin-request guard.
 *
 * Admin API routes are server-side only and must never be reachable without a
 * valid admin secret.  We use a shared bearer token (`ADMIN_API_SECRET`) as a
 * lightweight guard until a full session-based auth layer is added.
 *
 * Usage:
 *   import { assertAdminAuth } from "@/lib/api/adminAuth"
 *
 *   export const GET = withErrorHandling(async (req) => {
 *     assertAdminAuth(req)
 *     // ... handler logic
 *   })
 *
 * Set ADMIN_API_SECRET in your environment.  If the variable is absent, the
 * guard rejects all requests in production and logs a warning in development.
 */
import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"

import { logger } from "@/lib/logger"

class AdminAuthError extends Error {
  readonly status: number
  constructor(message: string, status = 401) {
    super(message)
    this.name = "AdminAuthError"
    this.status = status
  }
}

/**
 * Assert that the incoming request carries a valid admin bearer token.
 *
 * Throws an `AdminAuthError` (which `withErrorHandling` will catch and turn
 * into the appropriate HTTP error response) if authentication fails.
 *
 * Also reports unauthenticated attempts to Sentry so you can detect probing.
 */
export function assertAdminAuth(req: Request): void {
  const secret = process.env.ADMIN_API_SECRET

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      // In production, reject all requests when the secret is not configured.
      const err = new AdminAuthError(
        "Admin API secret is not configured.  Set ADMIN_API_SECRET.",
        500
      )
      Sentry.captureException(err, { tags: { source: "adminAuth" } })
      throw err
    }
    // In development, warn but allow — useful for local testing without secrets.
    logger.warn("[adminAuth] ADMIN_API_SECRET is not set; admin routes are unprotected in dev mode.")
    return
  }

  const authHeader = req.headers.get("authorization") ?? ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token || token !== secret) {
    const ip =
      req.headers.get("x-forwarded-for") ??
      req.headers.get("x-real-ip") ??
      "unknown"

    // Report unauthenticated admin access attempts so you can alert on them.
    Sentry.captureEvent({
      message: "Unauthenticated admin API request",
      level: "warning",
      tags: { source: "adminAuth", path: new URL(req.url).pathname },
      // IP is kept at warning level — not a full exception.
      extra: { ip },
    })

    throw new AdminAuthError("Unauthorized: valid admin token required.")
  }
}

/**
 * Convenience wrapper that returns a `NextResponse` instead of throwing.
 * Useful when you need to handle auth inline rather than relying on the
 * `withErrorHandling` wrapper.
 */
export function adminAuthResponse(req: Request): NextResponse | null {
  try {
    assertAdminAuth(req)
    return null // null means "auth passed, proceed"
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
