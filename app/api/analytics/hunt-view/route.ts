import { NextRequest, NextResponse } from "next/server"
import { getAllHuntViewCounts, getHuntViewCount, recordHuntView } from "@/lib/analytics"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const huntId = typeof body?.huntId === "number" ? body.huntId : Number(body?.huntId)

  if (!Number.isFinite(huntId) || huntId <= 0) {
    return NextResponse.json({ error: "Invalid huntId" }, { status: 400 })
  }

  const result = await recordHuntView(Math.floor(huntId))
  return NextResponse.json(result)
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const huntIdParam = url.searchParams.get("huntId")

  if (huntIdParam) {
    const huntId = Number(huntIdParam)
    if (!Number.isFinite(huntId) || huntId <= 0) {
      return NextResponse.json({ error: "Invalid huntId" }, { status: 400 })
    }

    const views = await getHuntViewCount(Math.floor(huntId))
    return NextResponse.json({ huntId: Math.floor(huntId), views })
  }

  const counts = await getAllHuntViewCounts()
  return NextResponse.json({ counts })
}
