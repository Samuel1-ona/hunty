import { NextResponse } from 'next/server';
import { getArchivedSeasons, getArchivedSeasonById } from '@/lib/seasonStore';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { withErrorHandling } from '@/lib/api/withErrorHandling';

/**
 * GET /api/v1/seasons/archived
 * Get all archived seasons
 */
export const GET = withErrorHandling(async (req: Request) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get('id');

  if (seasonId) {
    const id = parseInt(seasonId, 10);
    if (isNaN(id)) {
      throw new ValidationError('Invalid season ID', { id: seasonId });
    }

    const archived = getArchivedSeasonById(id);
    if (!archived) {
      throw new NotFoundError('Archived season not found', { seasonId: id });
    }

    return NextResponse.json({ archived });
  }

  const archived = getArchivedSeasons();
  return NextResponse.json({ archived });
});
