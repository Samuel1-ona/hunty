import { NextResponse } from "next/server"
import { readReviews } from "@/lib/reviews"

/**
 * GET /api/v1/hunts/[id]/ratings
 *
 * Returns the aggregate rating data for a single hunt:
 *   - averageRating  – average star value rounded to one decimal place (1–5)
 *   - reviewCount    – number of non-moderated reviews included in the average
 *   - distribution   – count of reviews per star value (1–5)
 *
 * Returns { averageRating: null, reviewCount: 0 } when no reviews exist yet.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const huntId = parseInt(id, 10)

    if (isNaN(huntId)) {
      return NextResponse.json({ error: "Invalid hunt ID" }, { status: 400 })
    }

    const allReviews = await readReviews()
    const huntReviews = allReviews.filter(
      (r) => r.huntId === huntId && !r.moderated
    )

    if (huntReviews.length === 0) {
      return NextResponse.json({
        huntId,
        averageRating: null,
        reviewCount: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      })
    }

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let ratingSum = 0

    for (const review of huntReviews) {
      ratingSum += review.rating
      distribution[review.rating] = (distribution[review.rating] ?? 0) + 1
    }

    const averageRating =
      Math.round((ratingSum / huntReviews.length) * 10) / 10

    return NextResponse.json({
      huntId,
      averageRating,
      reviewCount: huntReviews.length,
      distribution,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve ratings"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
