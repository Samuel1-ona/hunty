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

  let entries: StoredProgressEntry[]
  if (filter === "active") {
    entries = getActivePlayersForHunt(huntId)
  } else if (filter === "completed") {
    entries = getCompletedPlayersForHunt(huntId)
  } else {
    entries = getAllProgressForHunt(huntId)
  }

  entries.sort((a, b) => b.totalPoints - a.totalPoints)

  return NextResponse.json({
    data: entries,
    total: entries.length,
  })
})
