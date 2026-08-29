import { NextResponse } from "next/server"
import { readCompletions, writeCompletions } from "@/lib/reviews"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { type AuthContext, withAuth } from "@/lib/api/withAuth"

/**
 * POST /api/v1/hunts/[id]/complete
 * Register that a player address has completed a hunt.
 *
 * The player identity now comes from `withAuth` (auth.identity, which
 * already recognizes `playerAddress` as an identity field) instead of an
 * unauthenticated `playerAddress` body field read directly.
 */
export const POST = withErrorHandling(
  withAuth(async (
    req: Request,
    { params }: { params: Promise<{ id: string }> },
    auth: AuthContext
  ) => {
    try {
      const { id } = await params
      const huntId = parseInt(id, 10)

      if (isNaN(huntId)) {
        return NextResponse.json({ error: "Invalid hunt ID" }, { status: 400 })
      }

      const playerAddress = auth.identity

      const completions = await readCompletions()
      if (!completions[huntId]) {
        completions[huntId] = {}
      }
      completions[huntId][playerAddress] = true

      await writeCompletions(completions)

      return NextResponse.json({ success: true })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to register completion"
      return NextResponse.json({ error: message }, { status: 500 })
    }
  })
)
