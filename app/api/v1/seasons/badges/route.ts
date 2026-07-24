import { NextResponse } from "next/server";
import { getPlayerSeasonBadges, getAllSeasonBadges, awardSeasonBadge } from "@/lib/seasonStore";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/v1/seasons/badges
 * Get season badges for a player or all badges
 */
export async function GET(req: Request) {
  const ip = getIP(req);
  const { success, reset } = rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  try {
    if (address) {
      const badges = getPlayerSeasonBadges(address);
      return NextResponse.json({ badges });
    }

    const badges = getAllSeasonBadges();
    return NextResponse.json({ badges });
  } catch (error) {
    console.error("Error fetching season badges:", error);
    return NextResponse.json({ error: "Failed to fetch season badges" }, { status: 500 });
  }
}

/**
 * POST /api/v1/seasons/badges
 * Award a season badge to a player (admin only)
 */
export async function POST(req: Request) {
  const ip = getIP(req);
  const { success, reset } = rateLimit(ip, { limit: 10, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  try {
    const body = await req.json();
    const { seasonId, address, name, rank } = body;

    if (!seasonId || !address) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const badge = awardSeasonBadge(seasonId, address, name, rank);
    return NextResponse.json({ badge }, { status: 201 });
  } catch (error) {
    console.error("Error awarding season badge:", error);
    return NextResponse.json({ error: "Failed to award season badge" }, { status: 500 });
  }
}
