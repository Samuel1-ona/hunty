import { NextResponse } from "next/server"
import { readReviews, writeReviews } from "@/lib/reviews"
import { withValidation } from "@/lib/api/withValidation"
import { ValidationError } from "@/lib/api/errors"
import { requireVerifiedWallet } from "@/lib/api/walletAuth"
import { z } from "zod"

type RouteContext = { params: Promise<{ id: string; reviewId: string }> }

const paramsSchema = z.object({ id: z.string(), reviewId: z.string() })
const bodySchema = z.object({
  playerAddress: z.string().min(1).optional(),
  challenge: z.string().min(1),
  signature: z.string().min(1),
})

/**
 * POST /api/v1/hunts/[id]/reviews/[reviewId]/helpful
 * Toggle an upvote for a review from a specific user.
 */
export const POST = withValidation(
  { body: bodySchema, params: paramsSchema },
  async (req, _context, { body, params }) => {
    const huntId = parseInt(params!.id, 10)
    if (isNaN(huntId)) {
      throw new ValidationError("Invalid hunt ID", { id: params!.id })
    }

    const { reviewId } = params!
    const actorWallet = requireVerifiedWallet(req, {
      purpose: "hunt-review-helpful-vote",
      challenge: body.challenge,
      signature: body.signature,
      claimedAddress: body.playerAddress,
    })

    const reviews = await readReviews()
    const reviewIndex = reviews.findIndex((r) => r.id === reviewId && r.huntId === huntId)

    if (reviewIndex === -1) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    const review = reviews[reviewIndex]
    
    // Initialize helpfulness tracking arrays if they don't exist
    if (!review.upvotedBy) {
      review.upvotedBy = []
    }
    
    let hasVoted = false
    const existingVoteIndex = review.upvotedBy.findIndex((addr) => addr.toLowerCase() === actorWallet)
    
    if (existingVoteIndex === -1) {
      // One vote per verified user.
      review.upvotedBy.push(actorWallet)
    }
    hasVoted = true
    
    review.upvotes = review.upvotedBy.length
    reviews[reviewIndex] = review

    await writeReviews(reviews)

    return NextResponse.json({ 
      data: review,
      hasVoted
    })
  }
)
