import { NextResponse } from "next/server"
import { readCompletions, writeCompletions } from "@/lib/reviews"

/**
 * POST /api/v1/hunts/[id]/complete
 * Register that a player address has completed a hunt.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const huntId = parseInt(id, 10)

    if (isNaN(huntId)) {
      return NextResponse.json({ error: "Invalid hunt ID" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { playerAddress } = body

    if (!playerAddress || typeof playerAddress !== "string" || playerAddress.trim() === "") {
      return NextResponse.json({ error: "Invalid player address" }, { status: 400 })
    }

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
}
