import { NextResponse } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getAllProgressForHunt } from "@/lib/progressData";

export const GET = withErrorHandling<{
  params: Promise<{ id: string }>
}>(async (req, { params }) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { id } = await params;
  const huntId = parseInt(id, 10);

  if (isNaN(huntId)) {
    throw new ValidationError("Invalid hunt ID", { id });
  }

  const { searchParams } = new URL(req.url);
  const cursorParam = searchParams.get("cursor");
  const cursor = cursorParam ? parseInt(cursorParam, 10) : null;
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));

  if (cursorParam && (cursor == null || Number.isNaN(cursor))) {
    throw new ValidationError("Invalid cursor", { cursor: cursorParam });
  }

  const entries = getAllProgressForHunt(huntId);

  const leaderboard = entries
    .filter((e) => e.totalPoints > 0)
    .map((e) => ({
      address: e.wallet,
      points: e.totalPoints,
      completionCount: e.completed ? 1 : 0,
      completedAt: e.completedAt ?? undefined,
    }))
    .sort((a, b) => b.points - a.points);

  const total = leaderboard.length;
  const pageStart = cursor == null ? 0 : Math.max(0, cursor);
  const paginated = leaderboard.slice(pageStart, pageStart + limit);
  const nextCursor = paginated.length === limit ? pageStart + paginated.length : null;

  return NextResponse.json({
    data: paginated,
    pagination: {
      total,
      limit,
      cursor,
      nextCursor,
    },
  });
});
