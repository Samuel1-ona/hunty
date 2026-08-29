import { NextResponse } from "next/server";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { withAdminAuth } from "@/lib/api/withAuth";

/**
 * POST /api/v1/hunts/[id]/delete
 * Soft delete or permanently delete a hunt.
 *
 * Admin-only: the request carries no caller/ownership identity at all
 * (only `action`/`confirmed`), and `permanent-delete` is irreversible —
 * gated behind the admin secret until real per-hunt ownership verification
 * exists. See issue #865.
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

    let body: { action?: string; confirmed?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { action, confirmed } = body;

    try {
      if (action === "soft-delete") {
        const { softDeleteHunts } = await import("@/lib/huntStore");
        softDeleteHunts([huntId]);
        return NextResponse.json({
          success: true,
          message: "Hunt soft-deleted successfully. You can restore it within 30 days.",
        });
      } else if (action === "restore") {
        const { restoreHunts } = await import("@/lib/huntStore");
        restoreHunts([huntId]);
        return NextResponse.json({ success: true, message: "Hunt restored successfully" });
      } else if (action === "permanent-delete") {
        if (!confirmed) {
          return NextResponse.json(
            {
              error: "Confirmation required. Set confirmed=true to permanently delete.",
            },
            { status: 400 }
          );
        }
        const { permanentDeleteHunts } = await import("@/lib/huntStore");
        permanentDeleteHunts([huntId]);
        return NextResponse.json({
          success: true,
          message: "Hunt permanently deleted. This action cannot be undone.",
        });
      } else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
    } catch (error) {
      logger.error("Delete hunt error:", error);
      return NextResponse.json({ error: "Failed to delete hunt" }, { status: 500 });
    }
  })
);
