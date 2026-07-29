import { NextRequest, NextResponse } from "next/server"
import { submitHuntForModeration } from "@/lib/moderation/dbStore"
import type { StoredHunt } from "@/lib/types"

export async function POST(req: NextRequest) {
  let body: { hunt?: StoredHunt }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const hunt = body.hunt
  if (!hunt?.id || !hunt.title) {
    return NextResponse.json({ error: "hunt with id and title is required" }, { status: 400 })
  }

  const submission = await submitHuntForModeration(hunt)
  return NextResponse.json({ success: true, submission })
}
