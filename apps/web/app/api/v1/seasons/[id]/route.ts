import { NextResponse } from "next/server";
import {
  getSeasonById,
  updateSeasonStatus,
  archiveSeason,
  getCurrentSeasonLeaderboard,
} from "@/lib/seasonStore";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import type { SeasonStatus } from "@/lib/types";

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/seasons/[id]
 * Get a specific season by ID
 */
export const GET = withErrorHandling<Context>(async (req, { params }) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { id } = await params;
  const seasonId = parseInt(id, 10);

  if (isNaN(seasonId)) {
    throw new ValidationError("Invalid season ID", { id });
  }

  const season = getSeasonById(seasonId);
  if (!season) {
    throw new NotFoundError("Season not found", { seasonId });
  }

  const leaderboard = getCurrentSeasonLeaderboard();
  const now = Math.floor(Date.now() / 1000);
  const timeRemaining = season.status === "Active" ? Math.max(0, season.endTime - now) : 0;

  return NextResponse.json({
    season,
    leaderboard,
    timeRemaining,
  });
});

/**
 * PATCH /api/v1/seasons/[id]
 * Update season status or other fields (admin only)
 */
export const PATCH = withErrorHandling<Context>(async (req, { params }) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 10, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { id } = await params;
  const seasonId = parseInt(id, 10);

  if (isNaN(seasonId)) {
    throw new ValidationError("Invalid season ID", { id });
  }

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid request body");
  }
  const { status } = body;

  if (status) {
    const allowedStatuses: SeasonStatus[] = ["Upcoming", "Active", "Ended"];
    if (!allowedStatuses.includes(status as SeasonStatus)) {
      throw new ValidationError("Invalid season status", {
        status,
        allowed: allowedStatuses,
      });
    }
    updateSeasonStatus(seasonId, status as SeasonStatus);
  }

  const updatedSeason = getSeasonById(seasonId);
  if (!updatedSeason) {
    throw new NotFoundError("Season not found", { seasonId });
  }

  return NextResponse.json({ season: updatedSeason });
});

/**
 * POST /api/v1/seasons/[id]/archive
 * Archive a season with its final leaderboard
 */
export const POST = withErrorHandling<Context>(async (req, { params }) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 5, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { id } = await params;
  const seasonId = parseInt(id, 10);

  if (isNaN(seasonId)) {
    throw new ValidationError("Invalid season ID", { id });
  }

  let body: { finalLeaderboard?: unknown };
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid request body");
  }
  const { finalLeaderboard } = body;

  if (!Array.isArray(finalLeaderboard)) {
    throw new ValidationError("finalLeaderboard must be an array", { field: "finalLeaderboard" });
  }

  const archived = archiveSeason(seasonId, finalLeaderboard);
  return NextResponse.json({ archived }, { status: 200 });
});
 