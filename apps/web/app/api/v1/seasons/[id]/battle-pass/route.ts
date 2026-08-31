import { NextResponse } from "next/server";
import { getSeasonById } from "@/lib/seasonStore";
import { getBattlePassTiers, getPlayerProgress, claimTierReward } from "@/lib/battlePassStore";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { withValidation } from "@/lib/api/withValidation";
import { z } from "zod";

type Context = { params: Promise<{ id: string }> };

const paramsSchema = z.object({ id: z.string() });

const claimBodySchema = z.object({
  address: z.string(),
  tierIndex: z.number().int().min(0),
});

/**
 * GET /api/v1/seasons/[id]/battle-pass
 * Get battle pass for a season, optionally filtered by player address.
 */
export const GET = withErrorHandling(async (req: Request, context: Context) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });
  if (!success) return rateLimitResponse(reset);

  const { id } = await context.params;
  const seasonId = parseInt(id, 10);
  if (isNaN(seasonId)) {
    throw new ValidationError("Invalid season ID", { id });
  }

  const season = getSeasonById(seasonId);
  if (!season) {
    throw new NotFoundError("Season not found", { seasonId });
  }

  const tiers = getBattlePassTiers(season);

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  let progress = null;
  if (address) {
    progress = getPlayerProgress(seasonId, address);
  }

  return NextResponse.json({ seasonId, tiers, progress });
});

/**
 * POST /api/v1/seasons/[id]/battle-pass
 * Claim a tier reward for a player.
 */
export const POST = withValidation(
  { body: claimBodySchema, params: paramsSchema },
  async (req, _context, { body, params }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, { limit: 10, windowMs: 60 * 1000 });
    if (!success) return rateLimitResponse(reset);

    const seasonId = parseInt(params!.id, 10);
    if (isNaN(seasonId)) {
      throw new ValidationError("Invalid season ID", { id: params!.id });
    }

    const season = getSeasonById(seasonId);
    if (!season) {
      throw new NotFoundError("Season not found", { seasonId });
    }

    try {
      const progress = claimTierReward(seasonId, body.address, body.tierIndex);
      return NextResponse.json({ success: true, progress });
    } catch (e) {
      throw new ValidationError((e as Error).message, { tierIndex: body.tierIndex });
    }
  }
);
