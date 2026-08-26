import { NextResponse } from "next/server";
import { z } from "zod";

import { withValidation } from "@/lib/api/withValidation";
import { ValidationError, NotFoundError } from "@/lib/api/errors";
import { huntRefundBodySchema } from "@hunty/types/api-schemas";
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const paramsSchema = z.object({ id: z.string() });

const DEFAULT_GRACE_PERIOD_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * POST /api/v1/hunts/[id]/refund
 *
 * Lets a hunt creator reclaim the unclaimed reward balance after the hunt has
 * ended AND the configured grace period has elapsed.
 *
 * The grace period is read from the hunt's `gracePeriodSeconds` field (set at
 * creation time). It defaults to 7 days when not explicitly configured.
 *
 * Body: { creatorAddress: string }
 *
 * Returns: { success: true, receipt: RewardReceipt }
 */
export const POST = withValidation(
  { body: huntRefundBodySchema, params: paramsSchema },
  async (req, _context, { body, params }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, { limit: 20, windowMs: 60 * 1000 });
    if (!success) return rateLimitResponse(reset);

    const huntId = parseInt(params!.id, 10);
    if (isNaN(huntId)) {
      throw new ValidationError("Invalid hunt ID", { id: params!.id });
    }

    try {
      const { getHunt } = await import("@/lib/huntStore");
      const hunt = getHunt(String(huntId));

      if (!hunt) {
        throw new NotFoundError("Hunt not found", { huntId });
      }

      if (hunt.status !== "Ended" && hunt.status !== "Completed") {
        throw new ValidationError("Refunds are only available for ended or completed hunts", {
          status: hunt.status,
        });
      }

      const gracePeriodSeconds =
        typeof hunt.gracePeriodSeconds === "number"
          ? hunt.gracePeriodSeconds
          : DEFAULT_GRACE_PERIOD_SECONDS;

      const { refundUnclaimedRewards } = await import("@/lib/contracts/rewardManager");
      const receipt = await refundUnclaimedRewards(
        huntId,
        body.creatorAddress,
        gracePeriodSeconds
      );

      return NextResponse.json({ success: true, receipt });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
      const message = error instanceof Error ? error.message : "Refund failed";
      logger.error("Refund unclaimed rewards error:", error);
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
);
