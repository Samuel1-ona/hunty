import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"
import { ApiError } from "./errors"
import { auditLog } from "@/lib/audit"

export interface AdminUser {
  id: string
  email?: string
  role: string
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
  }

  return {
    id: token.sub!,
    email: token.email ?? undefined,
    role: token.role as string,
  }
}
