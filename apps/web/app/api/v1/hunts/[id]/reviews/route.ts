import { NextResponse } from "next/server"
import { readReviews, writeReviews, readCompletions } from "@/lib/reviews"
import type { HuntReview } from "@/lib/types"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { withValidation } from "@/lib/api/withValidation"
import { ValidationError } from "@/lib/api/errors"
import { requireVerifiedWallet } from "@/lib/api/walletAuth"
import { huntReviewBodySchema } from "@hunty/types/api-schemas"
import { z } from "zod"

type RouteContext = { params: Promise<{ id: string }> }

const paramsSchema = z.object({ id: z.string() })
const postBodySchema = huntReviewBodySchema.omit({ playerAddress: true }).extend({
  playerAddress: z.string().min(1).optional(),
  challenge: z.string().min(1),
  signature: z.string().min(1),
})

/**
 * GET /api/v1/hunts/[id]/reviews
 * Get all active (non-moderated) reviews for a specific hunt.
 */
export const GET = withErrorHandling(async (_req: Request, context: RouteContext) => {
  const { id } = await context.params
  const huntId = parseInt(id, 10)
  if (isNaN(huntId)) {
    throw new ValidationError("Invalid hunt ID", { id })
  }

  const reviews = await readReviews()
  const huntReviews = reviews.filter((r) => r.huntId === huntId && !r.moderated)

  return NextResponse.json({ data: huntReviews })
})

/**
 * POST /api/v1/hunts/[id]/reviews
 * Submit a review for a specific hunt.
 * Enforces:
 * - One review per completed hunt per wallet.
 * - Player address validation.
 * - Star rating between 1 and 5.
 * - Verification that player has completed the hunt.
 */
export const POST = withValidation(
  { body: postBodySchema, params: paramsSchema },
  async (req, _context, { body, params }) => {
    const huntId = parseInt(params!.id, 10)
    if (isNaN(huntId)) {
      throw new ValidationError("Invalid hunt ID", { id: params!.id })
    }

    const actorWallet = requireVerifiedWallet(req, {
      purpose: "hunt-review-write",
      challenge: body.challenge,
      signature: body.signature,
      claimedAddress: body.playerAddress,
    })
    const ratingVal = Number(body.rating)

    // 1. Enforce hunt completion verification
    const completions = await readCompletions()
    const completed = Object.entries(completions[huntId] ?? {}).some(
      ([address, done]) => done === true && address.toLowerCase() === actorWallet,
    )
    if (!completed) {
      return NextResponse.json(
        { error: "You must complete this hunt before submitting a review" },
        { status: 403 }
      )
    }

    // 2. Prevent duplicate reviews from the same wallet
    const reviews = await readReviews()
    const duplicate = reviews.some(
      (r) =>
        r.huntId === huntId &&
        r.playerAddress.toLowerCase() === actorWallet &&
        !r.moderated
    )
    if (duplicate) {
      return NextResponse.json({ error: "You have already reviewed this hunt" }, { status: 400 })
    }

    const newReview: HuntReview = {
      id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
      huntId,
      playerAddress: actorWallet,
      rating: ratingVal,
      text: typeof body.text === "string" ? body.text.trim() : undefined,
      difficultyRating: typeof body.difficultyRating === "string" ? body.difficultyRating : undefined,
      createdAt: Date.now(),
    }

    reviews.push(newReview)
    await writeReviews(reviews)

    return NextResponse.json({ data: newReview })
  }
)
