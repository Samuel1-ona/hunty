import { NextResponse } from "next/server";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import { NotFoundError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { withValidation } from "@/lib/api/withValidation";
import type { Reward } from "@/lib/types";

import {
  createSeason,
  getActiveSeason,
  getAllSeasons,
  getCurrentSeasonLeaderboard,
} from "@/lib/seasonStore";
import { seasonCreateBodySchema } from "@hunty/types/api-schemas";
import { getBattlePassTiers } from "@/lib/battlePassStore";

/**
 * GET /api/v1/seasons
 * Get all seasons or the active season
 */
export const GET = withErrorHandling(async (req: Request) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });
  if (!success) return rateLimitResponse(reset);

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  if (activeOnly) {
    const activeSeason = getActiveSeason();
    if (!activeSeason) {
      throw new NotFoundError("No active season");
    }

    const leaderboard = getCurrentSeasonLeaderboard();
    const tiers = getBattlePassTiers(activeSeason);
    return NextResponse.json({
      season: activeSeason,
      leaderboard,
      tiers,
      timeRemaining: activeSeason.endTime - Math.floor(Date.now() / 1000),
    });
  }

  const seasons = getAllSeasons();
  const seasonsWithTiers = seasons.map(season => ({
    ...season,
    tiers: getBattlePassTiers(season),
  }));
  return NextResponse.json({ seasons: seasonsWithTiers });
});

/**
 * POST /api/v1/seasons
 * Create a new season (admin only)
 */
export const POST = withValidation(
  { body: seasonCreateBodySchema },
  async (req, _context, { body }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, { limit: 10, windowMs: 60 * 1000 });
    if (!success) return rateLimitResponse(reset);

    const season = createSeason({
      name: body.name,
      startTime: Math.floor(new Date(body.startTime).getTime() / 1000),
      endTime: Math.floor(new Date(body.endTime).getTime() / 1000),
      status: "Upcoming",
      rewards: body.rewards as Reward[] | undefined,
    });

    return NextResponse.json({ season }, { status: 201 });
  }
);
