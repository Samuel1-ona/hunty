import { NextResponse } from 'next/server';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { ValidationError } from '@/lib/api/errors';
import { withValidation } from '@/lib/api/withValidation';
import { huntArchiveBodySchema } from '@hunty/types/api-schemas';
import { z } from 'zod';

const paramsSchema = z.object({ id: z.string() });

/**
 * POST /api/v1/hunts/[id]/archive
 * Archive a hunt (hide from public but preserve data).
 */
export const POST = withValidation(
  { body: huntArchiveBodySchema, params: paramsSchema },
  async (req, _context, { body, params }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, { limit: 30, windowMs: 60 * 1000 });
    if (!success) return rateLimitResponse(reset);

    const huntId = parseInt(params!.id, 10);
    if (isNaN(huntId)) {
      throw new ValidationError('Invalid hunt ID', { id: params!.id });
    }

    try {
      if (body.action === 'archive') {
        const { hideHuntsFromPublic } = await import('@/lib/huntStore');
        hideHuntsFromPublic([huntId]);
        return NextResponse.json({ success: true, message: 'Hunt archived successfully' });
      } else {
        const { unhideHuntsFromPublic } = await import('@/lib/huntStore');
        unhideHuntsFromPublic([huntId]);
        return NextResponse.json({ success: true, message: 'Hunt unarchived successfully' });
      }
    } catch (error) {
      logger.error('Archive hunt error:', error);
      return NextResponse.json({ error: 'Failed to archive hunt' }, { status: 500 });
    }
  }
);
