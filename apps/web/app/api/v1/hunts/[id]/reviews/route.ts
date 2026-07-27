import { NextResponse } from "next/server"
import { readReviews, writeReviews, readCompletions } from "@/lib/reviews"
import type { HuntReview } from "@/lib/types"

/**
 * GET /api/v1/hunts/[id]/reviews
 * Get all active (non-moderated) reviews for a specific hunt.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const huntId = parseInt(id, 10)

    if (isNaN(huntId)) {
      return NextResponse.json({ error: "Invalid hunt ID" }, { status: 400 })
    }

    const reviews = await readReviews()
    const huntReviews = reviews.filter((r) => r.huntId === huntId && !r.moderated)

    return NextResponse.json({ data: huntReviews })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to retrieve reviews" }, { status: 500 })
  }
}

/**
 * POST /api/v1/hunts/[id]/reviews
 * Submit a review for a specific hunt.
 * Enforces:
 * - One review per completed hunt per wallet.
 * - Player address validation.
 * - Star rating between 1 and 5.
 * - Verification that player has completed the hunt.
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
    const { playerAddress, rating, text, difficultyRating } = body

    if (!playerAddress || typeof playerAddress !== "string" || playerAddress.trim() === "") {
      return NextResponse.json({ error: "Player address is required" }, { status: 400 })
    }

    const ratingVal = parseInt(rating, 10)
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      return NextResponse.json({ error: "Rating must be a number between 1 and 5" }, { status: 400 })
    }

    // 1. Enforce hunt completion verification
    const completions = await readCompletions()
    const completed = completions[huntId]?.[playerAddress] === true
    if (!completed) {
      return NextResponse.json({ error: "You must complete this hunt before submitting a review" }, { status: 403 })
    }

    // 2. Prevent duplicate reviews from the same wallet
    const reviews = await readReviews()
    const duplicate = reviews.some(
      (r) => r.huntId === huntId && r.playerAddress.toLowerCase() === playerAddress.toLowerCase() && !r.moderated
    )
    if (duplicate) {
      return NextResponse.json({ error: "You have already reviewed this hunt" }, { status: 400 })
    }

    const newReview: HuntReview = {
      id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
      huntId,
      playerAddress,
      rating: ratingVal,
      text: typeof text === "string" ? text.trim() : undefined,
      difficultyRating: (typeof difficultyRating === "string" ? difficultyRating : undefined) as HuntReview["difficultyRating"],
      createdAt: Date.now(),
    }

    reviews.push(newReview)
    await writeReviews(reviews)

    return NextResponse.json({ data: newReview })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to submit review" }, { status: 500 })
  }
}
