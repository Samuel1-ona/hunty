import { NextResponse } from "next/server";
import { getSeasonById, updateSeasonStatus, archiveSeason, getCurrentSeasonLeaderboard } from "@/lib/seasonStore";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/v1/seasons/[id]
 * Get a specific season by ID
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getIP(req);
  const { success, reset } = rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { id } = await params;
  const seasonId = parseInt(id, 10);

  if (isNaN(seasonId)) {
    return NextResponse.json({ error: "Invalid season ID" }, { status: 400 });
  }

  try {
    const season = getSeasonById(seasonId);
    if (!season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    const leaderboard = getCurrentSeasonLeaderboard();
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = season.status === "Active" ? Math.max(0, season.endTime - now) : 0;

    return NextResponse.json({
      season,
      leaderboard,
      timeRemaining,
    });
  } catch (error) {
    console.error(`Error fetching season ${seasonId}:`, error);
    return NextResponse.json({ error: "Failed to fetch season" }, { status: 500 });
  }
}

/**
 * PATCH /api/v1/seasons/[id]
 * Update season status or other fields (admin only)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getIP(req);
  const { success, reset } = rateLimit(ip, { limit: 10, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { id } = await params;
  const seasonId = parseInt(id, 10);

  if (isNaN(seasonId)) {
    return NextResponse.json({ error: "Invalid season ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { status } = body;

    if (status) {
      updateSeasonStatus(seasonId, status);
    }

    const updatedSeason = getSeasonById(seasonId);
    return NextResponse.json({ season: updatedSeason });
  } catch (error) {
    console.error(`Error updating season ${seasonId}:`, error);
    return NextResponse.json({ error: "Failed to update season" }, { status: 500 });
  }
}

/**
 * POST /api/v1/seasons/[id]/archive
 * Archive a season with its final leaderboard
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getIP(req);
  const { success, reset } = rateLimit(ip, { limit: 5, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { id } = await params;
  const seasonId = parseInt(id, 10);

  if (isNaN(seasonId)) {
    return NextResponse.json({ error: "Invalid season ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { finalLeaderboard } = body;

    if (!Array.isArray(finalLeaderboard)) {
      return NextResponse.json({ error: "finalLeaderboard must be an array" }, { status: 400 });
    }

    const archived = archiveSeason(seasonId, finalLeaderboard);
    return NextResponse.json({ archived }, { status: 200 });
  } catch (error) {
    console.error(`Error archiving season ${seasonId}:`, error);
    return NextResponse.json({ error: "Failed to archive season" }, { status: 500 });
  }
}
