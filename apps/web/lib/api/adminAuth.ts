import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"
import { ApiError, AppError } from "./errors"
import { auditLog } from "@/lib/audit"
import { getClientIp } from "@/lib/api/ip"
import * as Sentry from "@sentry/nextjs"
import { logger } from "@/lib/logger"

export interface AdminUser {
  id: string
  email?: string
  role: string
}

class AdminAuthError extends AppError {
  constructor(message: string, status = 401) {
    super(message, status, "UNAUTHORIZED")
    this.name = "AdminAuthError"
  }
}

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
export async function assertAdminAuth(req: Request): Promise<AdminUser> {
  const token = await getToken({ req: req as NextRequest })

  if (!token) {
    const authHeader = req.headers.get("authorization") ?? ""
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
    const secret = process.env.ADMIN_API_SECRET

    if (!bearerToken || bearerToken !== secret) {
      const ip = getClientIp(req)
  
      // Report unauthenticated admin access attempts so you can alert on them.
      Sentry.captureEvent({
        message: "Unauthenticated admin API request",
        level: "warning",
        tags: { source: "adminAuth", path: new URL(req.url).pathname },
        // IP is kept at warning level — not a full exception.
        extra: { ip },
      })
      
      auditLog("unauthorized", { path: new URL(req.url).pathname, reason: "missing_token" }, "anonymous")
      throw new AdminAuthError("Unauthorized: valid admin token required.")
    }
    
    // If bearer token matches, return a dummy admin user
    return {
      id: "admin-secret-user",
      role: "admin"
    }
  }

  if (token.role !== "admin") {
    auditLog("unauthorized", { path: new URL(req.url).pathname, userId: token.sub, reason: "insufficient_role" }, token.sub ?? "unknown")
    throw new ApiError(403, "Forbidden")
  }

  return {
    id: token.sub!,
    email: token.email ?? undefined,
    role: token.role as string,
  }
}

/**
 * Convenience wrapper that returns a `NextResponse` instead of throwing.
 * Useful when you need to handle auth inline rather than relying on the
 * `withErrorHandling` wrapper.
 */
export async function adminAuthResponse(req: Request): Promise<NextResponse | null> {
  try {
    await assertAdminAuth(req)
    return null // null means "auth passed, proceed"
  } catch (err) {
    if (err instanceof AdminAuthError || err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: 'statusCode' in err ? err.statusCode : err.status })
    }
    throw err
  }
}
