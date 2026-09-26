import { NextResponse } from "next/server"

import { ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import {
  getAllProgressForHunt,
  getActivePlayersForHunt,
  getCompletedPlayersForHunt,
  StoredProgressEntry,
} from "@/lib/progressData"

const PLAYER_PAGE_SIZE = 20

export const GET = withErrorHandling<{
  params: Promise<{ id: string }>
}>(async (req, { params }) => {
  const ip = getIP(req)
  const { success, reset } = await rateLimit(ip, {
    limit: 60,
    windowMs: 60 * 1000,
  })
  if (!success) {
    return rateLimitResponse(reset)
  }

  const { id } = await params
  const huntId = parseInt(id, 10)
  if (isNaN(huntId)) {
    throw new ValidationError("Invalid hunt ID", { id })
  }

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get("filter")
  const cursorParam = searchParams.get("cursor")
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(PLAYER_PAGE_SIZE), 10)))

  const cursor =
    cursorParam && cursorParam !== "null" && cursorParam !== ""
      ? parseInt(cursorParam, 10)
      : null

  if (cursorParam && (cursor == null || Number.isNaN(cursor))) {
    throw new ValidationError("Invalid cursor", { cursor: cursorParam })
  }

  let entries: StoredProgressEntry[]
  if (filter === "active") {
    entries = getActivePlayersForHunt(huntId)
  } else if (filter === "completed") {
    entries = getCompletedPlayersForHunt(huntId)
  } else {
    entries = getAllProgressForHunt(huntId)
  }

  // Sort by total points descending so the highest scorers appear first.
  entries.sort((a, b) => b.totalPoints - a.totalPoints)

  const total = entries.length
  const pageStart = cursor == null ? 0 : Math.max(0, cursor)
  const paginated = entries.slice(pageStart, pageStart + limit)
  const nextCursor = paginated.length === limit ? pageStart + paginated.length : null

  return NextResponse.json({
    data: paginated,
    pagination: {
      total,
      limit,
      cursor,
      nextCursor,
    },
  })
})
