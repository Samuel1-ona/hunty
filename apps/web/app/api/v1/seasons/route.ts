import { NextResponse } from "next/server";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { withAdminAuth } from "@/lib/api/withAuth";
import type { Reward } from "@/lib/types";

import {
  createSeason,
  getActiveSeason,
  getAllSeasons,
  getCurrentSeasonLeaderboard,
} from "@/lib/seasonStore";

/**
 * GET /api/v1/seasons
 * Get all seasons or the active season
 */
export const GET = withErrorHandling(async (req: Request) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  if (activeOnly) {
    const activeSeason = getActiveSeason();
    if (!activeSeason) {
      throw new NotFoundError("No active season");
    }

    const leaderboard = getCurrentSeasonLeaderboard();
    return NextResponse.json({
      season: activeSeason,
      leaderboard,
      timeRemaining: activeSeason.endTime - Math.floor(Date.now() / 1000),
    });
  }

  const seasons = getAllSeasons();
  return NextResponse.json({ seasons });
});

/**
 * POST /api/v1/seasons
 * Create a new season (admin only)
 *
 * Was documented as "admin only" but had no auth check at all — one of the
 * unauthenticated admin-grade endpoints closed by issue #865.
 */
export const POST = withErrorHandling(
  withAdminAuth(async (req: Request) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, { limit: 10, windowMs: 60 * 1000 });

    if (!success) {
      return rateLimitResponse(reset);
    }

    let body: { name?: string; startTime?: string; endTime?: string; rewards?: Reward[] };
    try {
      body = await req.json();
    } catch {
      throw new ValidationError("Invalid request body");
    }
    const { name, startTime, endTime, rewards } = body;

    if (!name || !startTime || !endTime) {
      throw new ValidationError("Missing required fields", {
        required: ["name", "startTime", "endTime"],
      });
    }

    const season = createSeason({
      name,
      startTime: Math.floor(new Date(startTime).getTime() / 1000),
      endTime: Math.floor(new Date(endTime).getTime() / 1000),
      status: "Upcoming",
      rewards,
    });

    return NextResponse.json({ season }, { status: 201 });
  })
);
 