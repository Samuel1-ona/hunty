import { NextResponse } from "next/server";
import { getHuntById } from "@/lib/huntStore";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";

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

  const hunt = getHuntById(huntId);

  if (!hunt) {
    return NextResponse.json({ error: "Hunt not found" }, { status: 404 });
  }

  // Public endpoint should only expose public hunts if we follow the list's logic.
  if (hunt.is_private) {
    return NextResponse.json({ error: "Access denied. This hunt is private." }, { status: 403 });
  }

  return NextResponse.json({ data: hunt });
}
