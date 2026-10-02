import { NextResponse } from "next/server";
import { rateLimit, rateLimitPresets, getIP, rateLimitResponse } from "@/lib/rate-limit";
import { NotFoundError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { withValidation } from "@/lib/api/withValidation";
import { assertAdminIdentity } from "@/lib/api/adminIdentity";
import { auditLog } from "@/lib/audit";
import type { Reward } from "@/lib/types";

import {
  createSeason,
  getActiveSeason,
  getAllSeasons,
  getCurrentSeasonLeaderboard,
} from "@/lib/seasonStore";
import { seasonCreateBodySchema } from "@hunty/types/api-schemas";
import { getBattlePassTiers } from "@/lib/battlePassStore";

/** Challenge purpose that scopes a wallet signature to season creation. */
export const SEASON_CREATE_PURPOSE = "create-season";

/**
 * GET /api/v1/seasons
 * Get all seasons or the active season
 */
export const GET = withErrorHandling(async (req: Request) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, rateLimitPresets.read);
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
 *
 * Requires proof of admin identity: either a signed wallet challenge
 * (`x-wallet-address` / `x-wallet-challenge` / `x-wallet-signature`, signed for
 * the `create-season` purpose by a wallet listed in `ADMIN_WALLET_ADDRESSES`) or
 * the `ADMIN_API_SECRET` bearer token. Unauthenticated callers get 401,
 * authenticated non-admins get 403. The acting identity is taken from the
 * verified credential, never from the request body.
 */
export const POST = withValidation(
  { body: seasonCreateBodySchema },
  async (req, _context, { body }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, rateLimitPresets.sensitive);
    if (!success) return rateLimitResponse(reset);

    const admin = assertAdminIdentity(req, SEASON_CREATE_PURPOSE);

    const season = createSeason({
      name: body.name,
      startTime: Math.floor(new Date(body.startTime).getTime() / 1000),
      endTime: Math.floor(new Date(body.endTime).getTime() / 1000),
      status: "Upcoming",
      rewards: body.rewards as Reward[] | undefined,
      createdBy: admin.actor,
    });

    auditLog("season.create", { seasonId: season.id, name: season.name }, admin.actor);

    return NextResponse.json({ season }, { status: 201 });
  }
);
