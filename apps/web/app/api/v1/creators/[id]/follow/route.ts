/**
 * Creator follow API
 *
 * POST   /api/v1/creators/:id/follow  { followerWallet }        — follow a creator
 * DELETE /api/v1/creators/:id/follow  { followerWallet }        — unfollow a creator
 * GET    /api/v1/creators/:id/follow?followerWallet=...         — follow status + counts
 */

import { NextResponse } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { withValidation } from "@/lib/api/withValidation";
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  followCreator,
  getFollowersCount,
  isFollowing,
  unfollowCreator,
} from "@/lib/follows";
import { z } from "zod";

type Context = { params: Promise<{ id: string }> };

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({ followerWallet: z.string().min(1) });

function parseWallet(raw: string | null): string {
  if (!raw) throw new ValidationError("followerWallet is required");
  return raw;
}

export const POST = withValidation(
  { body: bodySchema, params: paramsSchema },
  async (_req: Request, _context: Context, { body, params }) => {
    const ip = getIP(_req);
    const { success, reset } = await rateLimit(ip, { limit: 50, windowMs: 60 * 1000 });
    if (!success) return rateLimitResponse(reset);

    const record = followCreator(body.followerWallet, params.id);

    return NextResponse.json({
      following: true,
      creatorWallet: params.id,
      followerWallet: record.followerWallet,
      followersCount: getFollowersCount(params.id),
    });
  }
);

export const DELETE = withValidation(
  { body: bodySchema, params: paramsSchema },
  async (_req: Request, _context: Context, { body, params }) => {
    const ip = getIP(_req);
    const { success, reset } = await rateLimit(ip, { limit: 50, windowMs: 60 * 1000 });
    if (!success) return rateLimitResponse(reset);

    const removed = unfollowCreator(body.followerWallet, params.id);

    return NextResponse.json({
      following: false,
      creatorWallet: params.id,
      followerWallet: body.followerWallet,
      removed,
      followersCount: getFollowersCount(params.id),
    });
  }
);

export const GET = withErrorHandling<Context>(async (req: Request, { params }) => {
  const { id: creatorWallet } = await params;
  const followerWallet = parseWallet(
    req.headers.get("x-follower-wallet") ?? new URL(req.url).searchParams.get("followerWallet")
  );

  return NextResponse.json({
    creatorWallet,
    followerWallet,
    following: isFollowing(followerWallet, creatorWallet),
    followersCount: getFollowersCount(creatorWallet),
  });
});
