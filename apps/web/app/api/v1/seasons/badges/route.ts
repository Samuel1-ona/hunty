import { NextResponse } from 'next/server';
import { getPlayerSeasonBadges, getAllSeasonBadges, awardSeasonBadge } from '@/lib/seasonStore';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';
import { withErrorHandling } from '@/lib/api/withErrorHandling';
import { withValidation } from '@/lib/api/withValidation';
import { seasonBadgeBodySchema } from '@hunty/types/api-schemas';

/**
 * GET /api/v1/seasons/badges
 * Get season badges for a player or all badges
 */
export const GET = withErrorHandling(async (req: Request) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });
  if (!success) return rateLimitResponse(reset);

  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (address) {
    const badges = getPlayerSeasonBadges(address);
    return NextResponse.json({ badges });
  }

  const badges = getAllSeasonBadges();
  return NextResponse.json({ badges });
});

/**
 * POST /api/v1/seasons/badges
 * Award a season badge to a player (admin only)
 */
export const POST = withValidation(
  { body: seasonBadgeBodySchema },
  async (req, _context, { body }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, { limit: 10, windowMs: 60 * 1000 });
    if (!success) return rateLimitResponse(reset);

    const badge = awardSeasonBadge(body.seasonId, body.address, body.name, body.rank);
    return NextResponse.json({ badge }, { status: 201 });
  }
);
