import { NextResponse } from "next/server";

import { listPublicActiveHuntsByCursorOptimized } from "@/lib/db/queryOptimizer";
import { ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getFollowing } from "@/lib/follows";
import type { StoredHunt } from "@/lib/types";

/**
 * GET /api/v1/hunts
 * List all public active hunts with cursor pagination.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { searchParams } = new URL(req.url);
  const cursorParam = searchParams.get("cursor");
  const cursor =
    cursorParam && cursorParam !== "null" && cursorParam !== "" ? parseInt(cursorParam, 10) : null;
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));
  const status = searchParams.get("status") || "Active";
  const reward = searchParams.get("reward") || "all";
  const difficulty = searchParams.get("difficulty") || "all";
  const category = searchParams.get("category") || "all";
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "newest";
  const ageClassification = searchParams.get("ageClassification") || "all";
  const tag = searchParams.get("tag") || "";
  const remotePlayableParam = searchParams.get("remotePlayable");
  const remotePlayable =
    remotePlayableParam === "true"
      ? 
      remotePlayableParam === "true"
        ? ? 
      true
      : remotePlayableParam === "false"
        ? false
      : undefined;
  const requestId = req.headers.get("x-request-id") ?? undefined;

  if (
    cursorParam &&
    cursorParam !== "null" &&
    cursorParam !== "" &&
    (cursor == null || Number.isNaN(cursor))
  ) {
    throw new ValidationError("Invalid cursor", { cursor: cursorParam });
  }

  const { data, nextCursor, total } = listPublicActiveHuntsByCursorOptimized({
    cursor,
    limit,
    status,
    reward,
    difficulty,
    category,
    search,
    sortBy,
    ageClassification,
    tag,
    remotePlayable,
    requestId,
  });

  let filteredData = data;
  let filteredTotal = total;
  if (following) {
    const follows = getFollowing(following);
    const followSet = new Set(follows.map((w) => w.toLowerCase()));
    filteredData = data.filter((hunt) => {
      const creator = (hunt as StoredHunt & { creator?: string }).creator;
      return creator ? followSet.has(creator.toLowerCase()) : false;
    });
    filteredTotal = filteredData.length;
  }

  return NextResponse.json({
    data: filteredData,
    pagination: {
      total: filteredTotal,
      limit,
      cursor,
      nextCursor,
    },
  });
});
