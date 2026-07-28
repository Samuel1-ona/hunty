import { NextResponse } from "next/server"

import {
  banUser,
  getAnomalyHistory,
  getBannedUsers,
  getConfig,
  getFlaggedUsers,
  getSubmissionHistory,
  setConfig,
  unbanUser,
} from "@/lib/anti-cheat"
import { NotFoundError, ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { assertAdminAuth } from "@/lib/api/adminAuth"

export const GET = withErrorHandling(async (req: Request) => {
  const adminKey = req.headers.get("x-admin-key")
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  assertAdminAuth(req)
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || "flagged"
  const wallet = searchParams.get("wallet") || undefined

  switch (type) {
    case "flagged":
      return NextResponse.json({ users: getFlaggedUsers() })
    case "anomalies":
      return NextResponse.json({ anomalies: getAnomalyHistory(wallet) })
    case "submissions":
      return NextResponse.json({ submissions: getSubmissionHistory(wallet) })
    case "bans":
      return NextResponse.json({ bans: getBannedUsers() })
    case "config":
      return NextResponse.json({ config: getConfig() })
    default:
      throw new ValidationError("Invalid type parameter", { type })
  }
})

export const POST = withErrorHandling(async (req: Request) => {
  const adminKey = req.headers.get("x-admin-key")
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  assertAdminAuth(req)
  let body: { action?: string; wallet?: string; ip?: string; reason?: string; bannedBy?: string; config?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    throw new ValidationError("Invalid request body")
  }

  const { action } = body

  if (action === "ban") {
    if (!body.wallet) {
      throw new ValidationError("wallet is required to ban", { field: "wallet" })
    }
    banUser(body.wallet, body.ip || "", body.reason || "Manual ban by admin", body.bannedBy || "admin")
    return NextResponse.json({ success: true })
  }

  if (action === "unban") {
    if (!body.wallet) {
      throw new ValidationError("wallet is required to unban", { field: "wallet" })
    }
    const result = unbanUser(body.wallet)
    if (!result) {
      throw new NotFoundError("User not found in bans", { wallet: body.wallet })
    }
    return NextResponse.json({ success: true })
  }

  if (action === "updateConfig") {
    if (body.config) {
      setConfig(body.config as Parameters<typeof setConfig>[0])
      return NextResponse.json({ success: true, config: getConfig() })
    }
    throw new ValidationError("config is required", { field: "config" })
  }

  throw new ValidationError("Invalid action", { action })
})
