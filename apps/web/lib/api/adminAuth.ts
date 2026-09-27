import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"
import { ApiError } from "./errors"
import { auditLog } from "@/lib/audit"

export interface AdminUser {
  id: string
  email?: string
  role: string
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
import { getClientIp } from "@/lib/api/ip"
import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"

import { logger } from "@/lib/logger"
import { AppError } from "./errors"

class AdminAuthError extends AppError {
  constructor(message: string, status = 401) {
    super(message, status, "UNAUTHORIZED")
    this.name = "AdminAuthError"
  }
}

export async function assertAdminAuth(req: Request): Promise<AdminUser> {
  const token = await getToken({ req: req as NextRequest })

  if (!token) {
    auditLog("unauthorized", { path: new URL(req.url).pathname, reason: "missing_token" }, "anonymous")
    throw new ApiError(401, "Unauthorized")
  }

  if (token.role !== "admin") {
    auditLog("unauthorized", { path: new URL(req.url).pathname, userId: token.sub, reason: "insufficient_role" }, token.sub ?? "unknown")
    throw new ApiError(403, "Forbidden")
  const authHeader = req.headers.get("authorization") ?? ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token || token !== secret) {
    const ip = getClientIp(req)

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

  return {
    id: token.sub!,
    email: token.email ?? undefined,
    role: token.role as string,
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
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }
}
