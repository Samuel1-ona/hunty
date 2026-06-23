import { NextResponse } from "next/server";
import { get_hunt_leaderboard } from "@/lib/contracts/hunt";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/v1/hunts/[id]/leaderboard
 * Get hunt leaderboard with pagination.
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
  const huntId = parseInt(id, 10);

  if (isNaN(huntId)) {
    return NextResponse.json({ error: "Invalid hunt ID" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));

  try {
    const leaderboard = await get_hunt_leaderboard(huntId);
    
    // get_hunt_leaderboard might return unsorted or current-player augmented data.
    // We sort by points descending to ensure a consistent leaderboard order.
    const sorted = [...leaderboard].sort((a, b) => b.points - a.points);
    
    const total = sorted.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginated = sorted.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error fetching leaderboard for hunt ${huntId}:`, error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
