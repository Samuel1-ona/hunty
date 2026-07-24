import { NextResponse } from "next/server";
import { getAllSeasons, getActiveSeason, createSeason, checkSeasonReset, archiveSeason, getCurrentSeasonLeaderboard } from "@/lib/seasonStore";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/v1/seasons
 * Get all seasons or the active season
 */
export async function GET(req: Request) {
  const ip = getIP(req);
  const { success, reset } = rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  try {
    if (activeOnly) {
      const activeSeason = getActiveSeason();
      if (!activeSeason) {
        return NextResponse.json({ error: "No active season" }, { status: 404 });
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
  } catch (error) {
    console.error("Error fetching seasons:", error);
    return NextResponse.json({ error: "Failed to fetch seasons" }, { status: 500 });
  }
}

/**
 * POST /api/v1/seasons
 * Create a new season (admin only)
 */
export async function POST(req: Request) {
  const ip = getIP(req);
  const { success, reset } = rateLimit(ip, { limit: 10, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  try {
    const body = await req.json();
    const { name, startTime, endTime, rewards } = body;

    if (!name || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const season = createSeason({
      name,
      startTime: Math.floor(new Date(startTime).getTime() / 1000),
      endTime: Math.floor(new Date(endTime).getTime() / 1000),
      status: "Upcoming",
      rewards,
    });

    return NextResponse.json({ season }, { status: 201 });
  } catch (error) {
    console.error("Error creating season:", error);
    return NextResponse.json({ error: "Failed to create season" }, { status: 500 });
  }
}
