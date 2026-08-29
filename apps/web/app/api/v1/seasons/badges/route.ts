import { NextResponse } from "next/server";
import { getPlayerSeasonBadges, getAllSeasonBadges, awardSeasonBadge } from "@/lib/seasonStore";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import { ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { withAdminAuth } from "@/lib/api/withAuth";

/**
 * GET /api/v1/seasons/badges
 * Get season badges for a player or all badges
 */
export const GET = withErrorHandling(async (req: Request) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (address) {
    const badges = getPlayerSeasonBadges(address);
    return NextResponse.json({ badges });
  }

  const badges = getAllSeasonBadges();
  return NextResponse.json({ badges });
});

/**
 * POST /api/v1/seasons/badges
 * Award a season badge to a player (admin only)
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

    let body: { seasonId?: number; address?: string; name?: string; rank?: number };
    try {
      body = await req.json();
    } catch {
      throw new ValidationError("Invalid request body");
    }
    const { seasonId, address, name, rank } = body;

    if (!seasonId || !address) {
      throw new ValidationError("Missing required fields", { required: ["seasonId", "address"] });
    }

    const badge = awardSeasonBadge(seasonId, address, name, rank);
    return NextResponse.json({ badge }, { status: 201 });
  })
);
 