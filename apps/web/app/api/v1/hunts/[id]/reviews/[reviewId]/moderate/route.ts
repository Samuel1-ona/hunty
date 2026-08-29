import { NextResponse } from "next/server"
import { readReviews, writeReviews } from "@/lib/reviews"
import { getHuntById } from "@/lib/huntStore"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { type AuthContext, withAuth } from "@/lib/api/withAuth"

/**
 * POST /api/v1/hunts/[id]/reviews/[reviewId]/moderate
 * Moderate a review. Action can be 'delete', 'flag', or 'unflag'.
 * Enforces creator-only authorization.
 *
 * The caller's identity now comes from `withAuth` (a wallet address, same
 * as the `moderatorAddress` body field this route used to trust directly)
 * instead of being read straight out of the request body.
 */
export const POST = withErrorHandling(withAuth(async (
  req: Request,
  { params }: { params: Promise<{ id: string; reviewId: string }> },
  auth: AuthContext
) => {
  try {
    const { id, reviewId } = await params
    const huntId = parseInt(id, 10)

    if (isNaN(huntId)) {
      return NextResponse.json({ error: "Invalid hunt ID" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { action } = body
    const moderatorAddress = auth.identity

    if (!["delete", "flag", "unflag"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be 'delete', 'flag', or 'unflag'" }, { status: 400 })
    }

    // 1. Authorize: Only the hunt creator can moderate reviews
    const hunt = getHuntById(huntId)
    if (!hunt) {
      return NextResponse.json({ error: "Hunt not found" }, { status: 404 })
    }

    const isCreator = !hunt.creator || hunt.creator === moderatorAddress
    if (!isCreator) {
      return NextResponse.json({ error: "Unauthorized: only the hunt creator can moderate reviews" }, { status: 403 })
    }

    // 2. Perform moderation on the target review
    const reviews = await readReviews()
    const review = reviews.find((r) => r.id === reviewId && r.huntId === huntId)

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    if (action === "delete") {
      review.moderated = true
    } else if (action === "flag") {
      review.flagged = true
    } else if (action === "unflag") {
      review.flagged = false
    }

    await writeReviews(reviews)

    return NextResponse.json({ success: true, data: review })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to moderate review"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}))
