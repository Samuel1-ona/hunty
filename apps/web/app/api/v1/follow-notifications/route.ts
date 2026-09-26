/**
 * GET /api/v1/follow-notifications?wallet=...
 *
 * Returns follow notifications for a player (e.g. "creator X published a new hunt").
 */

import { NextResponse } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getFollowNotifications } from "@/lib/follows";

export const GET = withErrorHandling(async (req: Request) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });
  if (!success) return rateLimitResponse(reset);

  const wallet = new URL(req.url).searchParams.get("wallet");
  if (!wallet) throw new ValidationError("wallet query parameter is required");

  const notifications = getFollowNotifications(wallet);

  return NextResponse.json({ data: notifications });
});
