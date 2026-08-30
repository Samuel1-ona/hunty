import { NextResponse } from 'next/server';

import { getPublicHuntByIdOptimized } from '@/lib/db/queryOptimizer';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { withErrorHandling } from '@/lib/api/withErrorHandling';
import { getIP, rateLimit, rateLimitResponse } from '@/lib/rate-limit';

/**
 * GET /api/v1/hunts/[id]
 * Get hunt details by ID.
 */
export const GET = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (req, { params }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });

    if (!success) {
      return rateLimitResponse(reset);
    }

    const { id } = await params;
    const huntId = parseInt(id, 10);

    if (isNaN(huntId)) {
      throw new ValidationError('Invalid hunt ID', { id });
    }

    const requestId = req.headers.get('x-request-id') ?? undefined;
    const hunt = getPublicHuntByIdOptimized(huntId, requestId);

    if (!hunt) {
      throw new NotFoundError('Hunt not found', { huntId });
    }

    return NextResponse.json({ data: hunt });
  }
);
