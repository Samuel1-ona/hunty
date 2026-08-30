import { NextResponse } from 'next/server';
import { readReviews, writeReviews } from '@/lib/reviews';
import { getHuntById } from '@/lib/huntStore';
import { withValidation } from '@/lib/api/withValidation';
import { ValidationError } from '@/lib/api/errors';
import { reviewModerateBodySchema } from '@hunty/types/api-schemas';
import { z } from 'zod';

const paramsSchema = z.object({
  id: z.string(),
  reviewId: z.string(),
});

/**
 * POST /api/v1/hunts/[id]/reviews/[reviewId]/moderate
 * Moderate a review. Action can be 'delete', 'flag', or 'unflag'.
 * Enforces creator-only authorization.
 */
export const POST = withValidation(
  { body: reviewModerateBodySchema, params: paramsSchema },
  async (_req, _context, { body, params }) => {
    const huntId = parseInt(params!.id, 10);
    if (isNaN(huntId)) {
      throw new ValidationError('Invalid hunt ID', { id: params!.id });
    }

    // 1. Authorize: Only the hunt creator can moderate reviews
    const hunt = getHuntById(huntId);
    if (!hunt) {
      return NextResponse.json({ error: 'Hunt not found' }, { status: 404 });
    }

    const isCreator = !hunt.creator || hunt.creator === body.moderatorAddress;
    if (!isCreator) {
      return NextResponse.json(
        { error: 'Unauthorized: only the hunt creator can moderate reviews' },
        { status: 403 }
      );
    }

    // 2. Perform moderation on the target review
    const reviews = await readReviews();
    const review = reviews.find((r) => r.id === params!.reviewId && r.huntId === huntId);

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (body.action === 'delete') {
      review.moderated = true;
    } else if (body.action === 'flag') {
      review.flagged = true;
    } else if (body.action === 'unflag') {
      review.flagged = false;
    }

    await writeReviews(reviews);

    return NextResponse.json({ success: true, data: review });
  }
);
