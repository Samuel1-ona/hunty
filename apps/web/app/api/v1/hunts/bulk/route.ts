import { huntsBulkBodySchema } from "@hunty/types/api-schemas";
import { NextResponse } from "next/server";

import { withValidation } from "@/lib/api/withValidation";
import { recordHuntAudit } from "@/lib/db/huntAuditLog";
import { logger } from "@/lib/logger";
import { getIP, rateLimit, rateLimitPresets, rateLimitResponse } from "@/lib/rate-limit";

/**
 * POST /api/v1/hunts/bulk
 * Bulk operations on multiple hunts (archive, delete, restore).
 *
 * Requires a signed wallet challenge or session token.
 * The actor is derived from the verified identity — never from the request body.
 * Every hunt in the batch must be owned by the authenticated caller.
 */
export const POST = withValidation(
  { body: huntsBulkBodySchema },
  async (req, _context, { body }) => {
    // ── Rate limiting ────────────────────────────────────────────────────────
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, rateLimitPresets.write);
    if (!success) return rateLimitResponse(reset);

    // ── Authentication ────────────────────────────────────────────────────────
    // Actor is derived from the verified caller identity, NOT from the body.
    const caller = await verifyCallerAuth(req);
    if (!caller.authenticated || !caller.actor) {
      return NextResponse.json(
        { error: caller.error ?? "Authentication required" },
        { status: caller.status ?? 401 }
      );
    }
    if (!caller.authorized) {
      return NextResponse.json(
        { error: caller.error ?? "Forbidden" },
        { status: caller.status ?? 403 }
      );
    }

    const actorAddress = caller.actor;

    // ── ID validation ─────────────────────────────────────────────────────────
    const ids = body.huntIds.map((id) =>
      typeof id === "string" ? parseInt(id, 10) : (id as number)
    );

    if (ids.some((id) => isNaN(id))) {
      return NextResponse.json({ error: "Invalid hunt ID in list" }, { status: 400 });
    }

    // ── Per-hunt ownership check ──────────────────────────────────────────────
    // Every hunt in the batch must belong to the verified caller.
    for (const id of ids) {
      const hunt = getHuntById(id);
      if (!hunt) {
        return NextResponse.json(
          { error: `Hunt ${id} not found` },
          { status: 404 }
        );
      }

      const owner = hunt.ownerAddress ?? hunt.creator;
      if (owner && owner !== actorAddress) {
        return NextResponse.json(
          { error: `Forbidden: hunt ${id} does not belong to the caller` },
          { status: 403 }
        );
      }
    }

    // ── Action dispatch ───────────────────────────────────────────────────────
    try {
      if (body.action === "archive") {
        const { hideHuntsFromPublic } = await import("@/lib/huntStore");
        hideHuntsFromPublic(ids);
        for (const id of ids) {
          await recordHuntAudit(id, "hunt archived", actorAddress, { action: "archive" });
        }
        return NextResponse.json({
          success: true,
          message: `${ids.length} hunt(s) archived successfully`
        });
      } else if (body.action === "unarchive") {
        const { unhideHuntsFromPublic } = await import("@/lib/huntStore");
        unhideHuntsFromPublic(ids);
        for (const id of ids) {
          await recordHuntAudit(id, "hunt unarchived", actorAddress, { action: "unarchive" });
        }
        return NextResponse.json({
          success: true,
          message: `${ids.length} hunt(s) unarchived successfully`
        });
      } else if (body.action === "soft-delete") {
        const { softDeleteHunts } = await import("@/lib/huntStore");
        softDeleteHunts(ids);
        for (const id of ids) {
          await recordHuntAudit(id, "hunt soft-deleted", actorAddress, { action: "soft-delete" });
        }
        return NextResponse.json({
          success: true,
          message: `${ids.length} hunt(s) soft-deleted successfully. You can restore them within 30 days.`
        });
      } else if (body.action === "restore") {
        const { restoreHunts } = await import("@/lib/huntStore");
        restoreHunts(ids);
        for (const id of ids) {
          await recordHuntAudit(id, "hunt restored", actorAddress, { action: "restore" });
        }
        return NextResponse.json({
          success: true,
          message: `${ids.length} hunt(s) restored successfully`
        });
      } else if (body.action === "permanent-delete") {
        if (!body.confirmed) {
          return NextResponse.json({
            error: "Confirmation required. Set confirmed=true to permanently delete."
          }, { status: 400 });
        }
        const { permanentDeleteHunts } = await import("@/lib/huntStore");
        permanentDeleteHunts(ids);
        for (const id of ids) {
          await recordHuntAudit(id, "hunt permanently deleted", actorAddress, { action: "permanent-delete" });
        }
        return NextResponse.json({
          success: true,
          message: `${ids.length} hunt(s) permanently deleted. This action cannot be undone.`
        });
      }

      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
      logger.error("Bulk hunt operation error:", error);
      return NextResponse.json({ error: "Failed to perform bulk operation" }, { status: 500 });
    }
  }
);
