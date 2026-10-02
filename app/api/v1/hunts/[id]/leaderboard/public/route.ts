import { NextResponse } from "next/server";
import { get_hunt_leaderboard } from "@/lib/contracts/hunt";

/**
 * GET /api/v1/hunts/[id]/leaderboard/public
 *
 * Public, unauthenticated leaderboard snapshot for a hunt.
 * The data is identical for every viewer so it is aggressively cached at the
 * CDN / reverse-proxy edge:
 *
 *   s-maxage=5                → shared caches (CDN) serve stale for up to 5 s
 *   stale-while-revalidate=30 → while revalidating, keep serving the old copy
 *                               for up to 30 more seconds (zero-latency reads)
 *
 * This turns an O(N-db-reads) endpoint into O(1) cache hits for the vast
 * majority of traffic while keeping data reasonably fresh (≤ 5 s lag).
 *
 * No rate-limiting is applied here because the CDN absorbs the burst and
 * the origin sees at most one real request every 5 seconds per hunt.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const huntId = parseInt(id, 10);

  if (Number.isNaN(huntId) || huntId <= 0) {
    return NextResponse.json({ error: "Invalid hunt ID" }, { status: 400 });
  }

  try {
    const leaderboard = await get_hunt_leaderboard(huntId);

    // Sort by points descending for a stable, deterministic response body.
    // A stable body matters: different insertion orders would produce different
    // ETags and defeat CDN deduplication.
    const sorted = [...leaderboard]
      .sort((a, b) => b.points - a.points)
      .map((entry, index) => ({
        rank: index + 1,
        address: entry.address,
        name: entry.name,
        points: entry.points,
        completionCount: entry.completionCount,
        completedAt: entry.completedAt,
      }));

    return NextResponse.json(
      { data: sorted, huntId },
      {
        status: 200,
        headers: {
          // Edge cache: fresh for 5 s, serve stale while revalidating for 30 s
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30",
          // Vary on nothing — identical response for all viewers
          Vary: "",
        },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error fetching public leaderboard for hunt ${huntId}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
