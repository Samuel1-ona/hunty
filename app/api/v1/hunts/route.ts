import { NextResponse } from "next/server";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import { listPublicActiveHuntsByCursorOptimized } from "@/lib/db/queryOptimizer";

/**
 * GET /api/v1/hunts
 * List all public active hunts with cursor pagination.
 */
export async function GET(req: Request) {
  const ip = getIP(req);
  const { success, reset } = rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { searchParams } = new URL(req.url);
  const cursorParam = searchParams.get("cursor");
  const cursor = cursorParam && cursorParam !== "null" && cursorParam !== "" ? parseInt(cursorParam, 10) : null;
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));
  const status = searchParams.get("status") || "Active";
  const reward = searchParams.get("reward") || "all";
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "newest";
  const requestId = req.headers.get("x-request-id") ?? undefined;

  if (cursorParam && cursorParam !== "null" && cursorParam !== "" && (cursor == null || Number.isNaN(cursor))) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }

  const { data, nextCursor, total } = listPublicActiveHuntsByCursorOptimized({
    cursor,
    limit,
    status,
    reward,
    search,
    sortBy,
    requestId,
  });

  return NextResponse.json({
    data,
    pagination: {
      total,
      limit,
      cursor,
      nextCursor,
    },
  });
}
