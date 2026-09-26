import { NextResponse } from "next/server";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/api/errors";
import { withValidation } from "@/lib/api/withValidation";
import { recordHuntAudit } from "@/lib/db/huntAuditLog";
import { dbGetRoleForWallet } from "@/lib/collaborationDb";
import { verifyCallerAuth } from "@/lib/walletAuth";
import { huntArchiveBodySchema } from "@hunty/types/api-schemas";
import { z } from "zod";

const paramsSchema = z.object({ id: z.string() })

/**
 * POST /api/v1/hunts/[id]/archive
 * Archive a hunt (hide from public but preserve data).
 */
export const POST = withValidation(
  { body: huntArchiveBodySchema, params: paramsSchema },
  async (req, _context, { body, params }) => {
    const auth = await verifyCallerAuth(req, body);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error || "Unauthenticated" }, { status: auth.status || 401 });
    }
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 403 });
    }

    const actorAddress = auth.actor;
    if (!actorAddress) {
      return NextResponse.json({ error: "Authenticated actor is missing" }, { status: 401 });
    }

    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, { limit: 30, windowMs: 60 * 1000 });
    if (!success) return rateLimitResponse(reset);

    const huntId = parseInt(params!.id, 10);
    if (isNaN(huntId)) {
      throw new ValidationError("Invalid hunt ID", { id: params!.id });
    }

    const role = await dbGetRoleForWallet(huntId, actorAddress);
    let isOwner = role === "owner";
    if (!isOwner) {
      const { getHuntById } = await import("@/lib/huntStore");
      const hunt = getHuntById(huntId);
      isOwner = hunt?.ownerAddress === actorAddress || hunt?.creator === actorAddress;
    }
    if (!isOwner) {
      return NextResponse.json({ error: "Only the hunt owner can archive or unarchive hunts" }, { status: 403 });
    }

    try {
      if (body.action === "archive") {
        const { hideHuntsFromPublic } = await import("@/lib/huntStore");
        hideHuntsFromPublic([huntId]);
        await recordHuntAudit(huntId, "hunt archived", actorAddress, { action: "archive" });
        return NextResponse.json({ success: true, message: "Hunt archived successfully" });
      } else {
        const { unhideHuntsFromPublic } = await import("@/lib/huntStore");
        unhideHuntsFromPublic([huntId]);
        await recordHuntAudit(huntId, "hunt unarchived", actorAddress, { action: "unarchive" });
        return NextResponse.json({ success: true, message: "Hunt unarchived successfully" });
      }
    } catch (error) {
      logger.error("Archive hunt error:", error);
      return NextResponse.json({ error: "Failed to archive hunt" }, { status: 500 });
    }
  }
);
