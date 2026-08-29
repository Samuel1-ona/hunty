import { NextResponse } from "next/server";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { withAdminAuth } from "@/lib/api/withAuth";

/**
 * POST /api/v1/hunts/[id]/archive
 * Archive a hunt (hide from public but preserve data).
 *
 * Admin-only: the request carries no caller/ownership identity at all
 * (only an `action` field), so there is nothing to authorize against the
 * hunt's creator yet — gated behind the admin secret until real per-hunt
 * ownership verification exists. See issue #865.
 */
export const POST = withErrorHandling(
  withAdminAuth(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, { limit: 30, windowMs: 60 * 1000 });

    if (!success) {
      return rateLimitResponse(reset);
    }

    const { id } = await params;
    const huntId = parseInt(id, 10);
    if (isNaN(huntId)) {
      return NextResponse.json({ error: "Invalid hunt ID" }, { status: 400 });
    }

    let body: { action?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { action } = body;

    try {
      if (action === "archive") {
        const { hideHuntsFromPublic } = await import("@/lib/huntStore");
        hideHuntsFromPublic([huntId]);
        return NextResponse.json({ success: true, message: "Hunt archived successfully" });
      } else if (action === "unarchive") {
        const { unhideHuntsFromPublic } = await import("@/lib/huntStore");
        unhideHuntsFromPublic([huntId]);
        return NextResponse.json({ success: true, message: "Hunt unarchived successfully" });
      } else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
    } catch (error) {
      logger.error("Archive hunt error:", error);
      return NextResponse.json({ error: "Failed to archive hunt" }, { status: 500 });
    }
  })
);
