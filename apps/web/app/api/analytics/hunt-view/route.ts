import { NextRequest, NextResponse } from "next/server"

import { getAllHuntViewCounts, getHuntViewCount, recordHuntView } from "@/lib/analytics"
import { ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { withValidation } from "@/lib/api/withValidation"
import { huntViewBodySchema } from "@hunty/types/api-schemas"

export const POST = withValidation(
  { body: huntViewBodySchema },
  async (_req, _context, { body }) => {
    const huntId = Math.floor(Number(body.huntId))
    const result = await recordHuntView(huntId)
    return NextResponse.json(result)
  }
)

export const GET = withErrorHandling(async (request: NextRequest) => {
  const url = new URL(request.url)
  const huntIdParam = url.searchParams.get("huntId")

  if (huntIdParam) {
    const huntId = Number(huntIdParam)
    if (!Number.isFinite(huntId) || huntId <= 0) {
      throw new ValidationError("Invalid huntId", { huntId: huntIdParam })
    }

    const views = await getHuntViewCount(Math.floor(huntId))
    return NextResponse.json({ huntId: Math.floor(huntId), views })
  }

  const counts = await getAllHuntViewCounts()
  return NextResponse.json({ counts })
})
