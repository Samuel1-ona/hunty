import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"
import { AuthError, ForbiddenError } from "./errors"
import { auditLog } from "@/lib/audit"

export interface AdminUser {
  id: string
  email?: string
  role: string
}

/**
 * Asserts that the request is authenticated and has admin role.
 *
 * Admin API routes are server-side only and must never be reachable without a
 * valid session token with admin role. This guard uses NextAuth.js JWT tokens.
 *
 * Usage:
 *   import { assertAdminAuth } from "@/lib/api/adminAuth"
 *
 *   export const GET = withErrorHandling(async (req) => {
 *     assertAdminAuth(req)
 *     // ... handler logic
 *   })
 *
 * Throws:
 *   - AuthError (401) if no token is present
 *   - ForbiddenError (403) if token role is not "admin"
 */
export async function assertAdminAuth(req: Request): Promise<AdminUser> {
  const token = await getToken({ req: req as NextRequest })

  if (!token) {
    auditLog(
      "unauthorized",
      { path: new URL(req.url).pathname, reason: "missing_token" },
      "anonymous"
    )
    throw new AuthError("Unauthorized")
  }

  if (token.role !== "admin") {
    auditLog(
      "unauthorized",
      { path: new URL(req.url).pathname, userId: token.sub, reason: "insufficient_role" },
      token.sub ?? "unknown"
    )
    throw new ForbiddenError("Forbidden")
  }

  return {
    id: token.sub!,
    email: token.email ?? undefined,
    role: token.role as string,
  }
}
