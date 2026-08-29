/**
 * POST /api/v1/hunts/:id/notify-followers
 *
 * Triggers follower notifications when a creator publishes a hunt. Looks the
 * hunt up server-side, then notifies every follower of the hunt's creator.
 */

import { NextResponse } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getPublicHuntByIdOptimized } from "@/lib/db/queryOptimizer";
import { notifyFollowersOfNewHunt } from "@/lib/follows";

type Context = { params: Promise<{ id: string }> };

export const POST = withErrorHandling<Context>(async (req: Request, { params }) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 30, windowMs: 60 * 1000 });
  if (!success) return rateLimitResponse(reset);

  const { id } = await params;
  const huntId = parseInt(id, 10);
  if (Number.isNaN(huntId)) throw new ValidationError("Invalid hunt ID", { id });

  const hunt = getPublicHuntByIdOptimized(huntId);
  if (!hunt) throw new ValidationError("Hunt not found", { huntId });

  const creator = (hunt as { creator?: string }).creator;
  if (!creator) {
    return NextResponse.json({ notified: 0, reason: "no_creator" });
  }

  const notifications = notifyFollowersOfNewHunt(creator, { id: hunt.id, title: hunt.title });

  return NextResponse.json({ notified: notifications.length });
});
