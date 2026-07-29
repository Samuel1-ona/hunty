import { NextResponse } from "next/server";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST /api/v1/hunts/bulk
 * Bulk operations on multiple hunts (archive, delete, restore).
 */
export async function POST(req: Request) {
  const ip = getIP(req);
  const { success, reset } = rateLimit(ip, { limit: 30, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  let body: { action?: string; huntIds?: (string | number)[]; confirmed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { action, huntIds, confirmed } = body;

  if (!Array.isArray(huntIds) || huntIds.length === 0) {
    return NextResponse.json({ error: "Invalid hunt IDs" }, { status: 400 });
  }

  const ids = huntIds.map((id: string | number) => typeof id === "string" ? parseInt(id, 10) : id);

  if (ids.some((id: number) => isNaN(id))) {
    return NextResponse.json({ error: "Invalid hunt ID in list" }, { status: 400 });
  }

  try {
    if (action === "archive") {
      const { hideHuntsFromPublic } = await import("@/lib/huntStore");
      hideHuntsFromPublic(ids);
      return NextResponse.json({
        success: true,
        message: `${ids.length} hunt(s) archived successfully`
      });
    } else if (action === "unarchive") {
      const { unhideHuntsFromPublic } = await import("@/lib/huntStore");
      unhideHuntsFromPublic(ids);
      return NextResponse.json({
        success: true,
        message: `${ids.length} hunt(s) unarchived successfully`
      });
    } else if (action === "soft-delete") {
      const { softDeleteHunts } = await import("@/lib/huntStore");
      softDeleteHunts(ids);
      return NextResponse.json({
        success: true,
        message: `${ids.length} hunt(s) soft-deleted successfully. You can restore them within 30 days.`
      });
    } else if (action === "restore") {
      const { restoreHunts } = await import("@/lib/huntStore");
      restoreHunts(ids);
      return NextResponse.json({
        success: true,
        message: `${ids.length} hunt(s) restored successfully`
      });
    } else if (action === "permanent-delete") {
      if (!confirmed) {
        return NextResponse.json({
          error: "Confirmation required. Set confirmed=true to permanently delete."
        }, { status: 400 });
      }
      const { permanentDeleteHunts } = await import("@/lib/huntStore");
      permanentDeleteHunts(ids);
      return NextResponse.json({
        success: true,
        message: `${ids.length} hunt(s) permanently deleted. This action cannot be undone.`
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("Bulk hunt operation error:", error);
    return NextResponse.json({ error: "Failed to perform bulk operation" }, { status: 500 });
  }
}
