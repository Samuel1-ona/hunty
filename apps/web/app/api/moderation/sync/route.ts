import { NextRequest, NextResponse } from "next/server"
import {
  getCreatorNotifications,
  getModerationStatusForHunts,
  markNotificationRead,
} from "@/lib/moderation/dbStore"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get("email") || undefined
  const huntIdsParam = searchParams.get("huntIds")

  if (huntIdsParam) {
    const huntIds = huntIdsParam
      .split(",")
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !Number.isNaN(id))
    return NextResponse.json({ statuses: await getModerationStatusForHunts(huntIds) })
  }

  return NextResponse.json({ notifications: await getCreatorNotifications(email) })
}

export async function POST(req: NextRequest) {
  let body: { notificationId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!body.notificationId) {
    return NextResponse.json({ error: "notificationId is required" }, { status: 400 })
  }

  const ok = await markNotificationRead(body.notificationId)
  if (!ok) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 })
  }
  return NextResponse.json({ success: true })
}
