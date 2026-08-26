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
} from "./../../../lib/antiCheatDb"
import { NotFoundError } from "./../../../lib/api/errors"
import { withErrorHandling } from "../../../../lib/api/withErrorHandling"
import { withValidation } from "../../../../lib/api/withValidation"
import { assertAdminAuth } from "../../../../lib/api/adminAuth"
import { antiCheatBodySchema, antiCheatQuerySchema } from "@hunty/types/api-schemas"
import { auditLog } from "../../../../lib/audit"

export const GET = withErrorHandling(async (req: Request) => {
  const admin = await assertAdminAuth(req)
  const { searchParams } = new URL(req.url)
  const queryResult = antiCheatQuerySchema.safeParse({
    type: searchParams.get("type") ?? undefined,
    wallet: searchParams.get("wallet") ?? undefined,
  })
  if (!queryResult.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", code: "VALIDATION_ERROR", details: queryResult.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { type, wallet } = queryResult.data

  switch (type) {
    case "flagged":
      return NextResponse.json({ users: await getFlaggedUsers() })
    case "anomalies":
      return NextResponse.json({ anomalies: await getAnomalyHistory(wallet) })
    case "submissions":
      return NextResponse.json({ submissions: await getSubmissionHistory(wallet) })
    case "bans":
      return NextResponse.json({ bans: await getBannedUsers() })
    case "config":
      return NextResponse.json({ config: await getConfig() })
  }
})

export const POST = withValidation(
  { body: antiCheatBodySchema },
  async (req, _context, { body }) => {
    const admin = await assertAdminAuth(req)
    const actor = admin.email || admin.id || "unknown"

    if (body.action === "ban") {
      await banUser(body.wallet, body.ip ?? "", body.reason ?? "Manual ban by admin", body.bannedBy ?? actor)
      auditLog("ban", { wallet: body.wallet, reason: body.reason, ip: body.ip }, actor)
      return NextResponse.json({ success: true })
    }

    if (body.action === "unban") {
      const result = await unbanUser(body.wallet)
      if (!result) {
        throw new NotFoundError("User not found in bans", { wallet: body.wallet })
      }
      auditLog("unban", { wallet: body.wallet }, actor)
      return NextResponse.json({ success: true })
    }

    // action === "updateConfig"
    const config = body.config as Parameters<typeof setConfig>[0]
    await setConfig(config)
    auditLog("updateConfig", { config }, actor)
    return NextResponse.json({ success: true, config: await getConfig() })
  }
)
