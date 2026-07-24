import { NextResponse } from "next/server"
import {
  getFlaggedUsers,
  getAnomalyHistory,
  getSubmissionHistory,
  getBannedUsers,
  banUser,
  unbanUser,
  getConfig,
  setConfig,
} from "@/lib/anti-cheat"

export async function GET(req: Request) {
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
      return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 })
  }
}

export async function POST(req: Request) {
  let body: { action?: string; wallet?: string; ip?: string; reason?: string; bannedBy?: string; config?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { action } = body

  if (action === "ban") {
    if (!body.wallet) {
      return NextResponse.json({ error: "wallet is required to ban" }, { status: 400 })
    }
    banUser(body.wallet, body.ip || "", body.reason || "Manual ban by admin", body.bannedBy || "admin")
    return NextResponse.json({ success: true })
  }

  if (action === "unban") {
    if (!body.wallet) {
      return NextResponse.json({ error: "wallet is required to unban" }, { status: 400 })
    }
    const result = unbanUser(body.wallet)
    if (!result) {
      return NextResponse.json({ error: "User not found in bans" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  }

  if (action === "updateConfig") {
    if (body.config) {
      setConfig(body.config as Parameters<typeof setConfig>[0])
      return NextResponse.json({ success: true, config: getConfig() })
    }
    return NextResponse.json({ error: "config is required" }, { status: 400 })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
