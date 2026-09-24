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
} from "@/lib/antiCheatDb"
import { NotFoundError, UnauthorizedError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { withValidation } from "@/lib/api/withValidation"
import { assertAdminAuth } from "@/lib/api/adminAuth"
import { antiCheatBodySchema, antiCheatQuerySchema } from "@hunty/types/api-schemas"

type AdminUser = {
  id: string
  email: string
  role: string
}

function logUnauthorized(req: Request, reason: string) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const method = req.method
  const url = req.url
  console.error(`[UNAUTHORIZED] ${method} ${url} from ${ip}: ${reason}`)
}

function audit(actor: string, action: string, details: Record<string, unknown> = {}) {
  console.log(`[AUDIT] actor=${actor} action=${action} details=${JSON.stringify(details)}`)
}

async function requireAdmin(req: Request): Promise<AdminUser> {
  const adminKey = req.headers.get("x-admin-key")
  if (adminKey !== null) {
    if (adminKey !== process.env.ADMIN_API_KEY) {
      logUnauthorized(req, "invalid api key")
      throw new UnauthorizedError("Invalid API key")
    }
    return { id: "api-key", email: "api-key@internal", role: "ADMIN" }
  }

  try {
    const admin = await assertAdminAuth(req)
    if (!admin || admin.role !== "ADMIN") {
      throw new UnauthorizedError("Requires admin privileges")
    }
    return admin
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      logUnauthorized(req, "session not admin")
      throw error
    }
    logUnauthorized(req, "session auth failed")
    throw new UnauthorizedError("Authentication required")
  }
}

export const GET = withErrorHandling(async (req: Request) => {
  await requireAdmin(req)

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
    const admin = await requireAdmin(req)

    if (body.action === "ban") {
      audit(admin.email, "anti-cheat.ban", { wallet: body.wallet, ip: body.ip ?? "" })
      await banUser(body.wallet, body.ip ?? "", body.reason ?? "Manual ban by admin", body.bannedBy ?? admin.email)
      return NextResponse.json({ success: true })
    }

    if (body.action === "unban") {
      audit(admin.email, "anti-cheat.unban", { wallet: body.wallet })
      const result = await unbanUser(body.wallet)
      if (!result) {
        throw new NotFoundError("User not found in bans", { wallet: body.wallet })
      }
      return NextResponse.json({ success: true })
    }

    // action === "updateConfig"
    audit(admin.email, "anti-cheat.config.update", { config: body.config })
    await setConfig(body.config as Parameters<typeof setConfig>[0])
    return NextResponse.json({ success: true, config: await getConfig() })
  }
)
