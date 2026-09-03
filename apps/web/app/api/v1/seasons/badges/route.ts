import { NextResponse } from "next/server";
import { getPlayerSeasonBadges, getAllSeasonBadges, awardSeasonBadge, getSeasonTiers, setSeasonTiers, getPlayerProgress, updatePlayerProgress } from "@/lib/seasonStore";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { withValidation } from "@/lib/api/withValidation";
import { seasonBadgeBodySchema, seasonTiersBodySchema, playerProgressBodySchema } from "@hunty/types/api-schemas";

/**
 * GET /api/v1/seasons/badges
 * Get season badges for a player or all badges.
 * Supports optional seasonId query parameter to filter by season (including archived ones).
 * If address and seasonId are provided, returns player progress for that season.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });
  if (!success) return rateLimitResponse(reset);

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const seasonId = searchParams.get("seasonId");

  if (address && seasonId) {
    const progress = getPlayerProgress(address, seasonId);
    const tiers = getSeasonTiers(seasonId);
    return NextResponse.json({ progress, tiers });
  }

  if (address) {
    const badges = getPlayerSeasonBadges(address, seasonId || undefined);
    return NextResponse.json({ badges });
  }

  const badges = getAllSeasonBadges(seasonId || undefined);
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

/**
 * PUT /api/v1/seasons/badges
 * Define tiers and rewards for a season (admin only).
 * Body: { seasonId: string, tiers: [{ tier: number, reward: string, requiredProgress: number }] }
 */
export const PUT = withValidation(
  { body: seasonTiersBodySchema },
  async (req, _context, { body }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, { limit: 10, windowMs: 60 * 1000 });
    if (!success) return rateLimitResponse(reset);

    const tiers = setSeasonTiers(body.seasonId, body.tiers);
    return NextResponse.json({ tiers }, { status: 201 });
  }
);

/**
 * PATCH /api/v1/seasons/badges
 * Record player progress earned through play.
 * Body: { seasonId: string, address: string, progressDelta: number }
 */
export const PATCH = withValidation(
  { body: playerProgressBodySchema },
  async (req, _context, { body }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });
    if (!success) return rateLimitResponse(reset);

    const progress = updatePlayerProgress(body.seasonId, body.address, body.progressDelta);
    return NextResponse.json({ progress });
  }
);