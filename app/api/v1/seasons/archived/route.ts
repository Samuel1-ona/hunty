import { NextResponse } from "next/server";
import { getArchivedSeasons, getArchivedSeasonById } from "@/lib/seasonStore";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/v1/seasons/archived
 * Get all archived seasons
 */
export async function GET(req: Request) {
  const ip = getIP(req);
  const { success, reset } = rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("id");

  try {
    if (seasonId) {
      const id = parseInt(seasonId, 10);
      if (isNaN(id)) {
        return NextResponse.json({ error: "Invalid season ID" }, { status: 400 });
      }

      const archived = getArchivedSeasonById(id);
      if (!archived) {
        return NextResponse.json({ error: "Archived season not found" }, { status: 404 });
      }

      return NextResponse.json({ archived });
    }

    const archived = getArchivedSeasons();
    return NextResponse.json({ archived });
  } catch (error) {
    console.error("Error fetching archived seasons:", error);
    return NextResponse.json({ error: "Failed to fetch archived seasons" }, { status: 500 });
  }
}
