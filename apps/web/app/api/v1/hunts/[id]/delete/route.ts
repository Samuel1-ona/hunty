import { NextResponse } from "next/server";
import { rateLimit, rateLimitPresets, getIP, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/api/errors";
import { withValidation } from "@/lib/api/withValidation";
import { recordHuntAudit } from "@/lib/db/huntAuditLog";
import { huntDeleteBodySchema } from "@hunty/types/api-schemas";
import { z } from "zod";

const paramsSchema = z.object({ id: z.string() })

/**
 * POST /api/v1/hunts/[id]/delete
 * Soft delete or permanently delete a hunt.
 */
export const POST = withValidation(
  { body: huntDeleteBodySchema, params: paramsSchema },
  async (req, _context, { body, params }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, rateLimitPresets.write);
    if (!success) return rateLimitResponse(reset);

    const huntId = parseInt(params!.id, 10);
    if (isNaN(huntId)) {
      throw new ValidationError("Invalid hunt ID", { id: params!.id });
    }

    const actorAddress = body!.actorAddress;

    try {
      if (body.action === "soft-delete") {
        const { softDeleteHunts } = await import("@/lib/huntStore");
        softDeleteHunts([huntId]);
        await recordHuntAudit(huntId, "hunt soft-deleted", actorAddress, {
          action: "soft-delete",
        });
        return NextResponse.json({
          success: true,
          message: "Hunt soft-deleted successfully. You can restore it within 30 days.",
        });
      } else if (body.action === "restore") {
        const { restoreHunts } = await import("@/lib/huntStore");
        restoreHunts([huntId]);
        await recordHuntAudit(huntId, "hunt restored", actorAddress, {
          action: "restore",
        });
        return NextResponse.json({ success: true, message: "Hunt restored successfully" });
      } else {
        // permanent-delete
        if (!body.confirmed) {
          return NextResponse.json(
            { error: "Confirmation required. Set confirmed=true to permanently delete." },
            { status: 400 }
          );
        }
        const { permanentDeleteHunts } = await import("@/lib/huntStore");
        permanentDeleteHunts([huntId]);
        await recordHuntAudit(huntId, "hunt permanently deleted", actorAddress, {
          action: "permanent-delete",
        });
        return NextResponse.json({
          success: true,
          message: "Hunt permanently deleted. This action cannot be undone.",
        });
      }
    } catch (error) {
      logger.error("Delete hunt error:", error);
      return NextResponse.json({ error: "Failed to delete hunt" }, { status: 500 });
    }
  }
);
