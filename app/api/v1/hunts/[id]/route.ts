import { NextResponse } from "next/server";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import { getPublicHuntByIdOptimized } from "@/lib/db/queryOptimizer";

/**
 * GET /api/v1/hunts/[id]
 * Get hunt details by ID.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getIP(req);
  const { success, reset } = rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { id } = await params;
  const huntId = parseInt(id, 10);

  if (isNaN(huntId)) {
    return NextResponse.json({ error: "Invalid hunt ID" }, { status: 400 });
  }

  const requestId = req.headers.get("x-request-id") ?? undefined;
  const hunt = getPublicHuntByIdOptimized(huntId, requestId);

  if (!hunt) {
    return NextResponse.json({ error: "Hunt not found" }, { status: 404 });
  }

  return NextResponse.json({ data: hunt });
}
