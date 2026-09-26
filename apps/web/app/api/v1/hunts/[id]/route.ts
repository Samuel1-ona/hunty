import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getPublicHuntByIdOptimized } from "@/lib/db/queryOptimizer";
import { getHuntVersion, listHuntVersions } from "@/lib/db/huntVersions";
import { recordHuntAudit } from "@/lib/db/huntAuditLog";
import { createHuntVersion } from "@/lib/db/huntVersions";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { withValidation } from "@/lib/api/withValidation";
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { huntVersionEditBodySchema } from "@hunty/types/api-schemas";
import { verifyCallerAuth } from "@/lib/walletAuth";

const paramsSchema = z.object({ id: z.string() });

function assertCreator(snapshot: Record<string, unknown>, actorAddress: string): void {
  const creator = snapshot.creator ?? snapshot.ownerAddress;
  if (typeof creator !== "string" || creator !== actorAddress) {
    throw new ForbiddenError("Only the hunt creator can edit this hunt");
  }
}

/**
 * Compute a shallow diff between two objects, returning only changed keys.
 */
function computeDiff(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
): Record<string, unknown> {
  const diff: Record<string, unknown> = {};
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  for (const key of allKeys) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = { from: oldVal, to: newVal };
    }
  }
  return diff;
}

/**
 * GET /api/v1/hunts/[id]
 * Get hunt details by ID.
 */
export const GET = withErrorHandling<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
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

  const requestId = req.headers.get("x-request-id") ?? undefined;
  const hunt = getPublicHuntByIdOptimized(huntId, requestId);

  if (!hunt) {
    throw new NotFoundError("Hunt not found", { huntId });
  }

  return NextResponse.json({ data: hunt });
});

/**
 * PATCH /api/v1/hunts/[id]
 * Store the submitted hunt snapshot as the next immutable version.
 */
export const PATCH = withValidation(
  { body: huntVersionEditBodySchema, params: paramsSchema },
  async (req, _context, { body, params }) => {
    // Privileged write: reject unauthenticated callers before touching state.
    const auth = await verifyCallerAuth(req as NextRequest);
    if (!auth.authenticated) {
      throw new AuthError(auth.error ?? "Authentication required");
    }
    if (!auth.authorized) {
      throw new ForbiddenError(auth.error ?? "Access denied");
    }

    // The actor is derived from the verified wallet/session, never from the body.
    const actor = auth.actor ?? "";

    const huntId = Number(params!.id);
    if (!Number.isInteger(huntId) || huntId <= 0 || body!.snapshot.id !== huntId) {
      throw new ValidationError("Invalid hunt ID", { id: params!.id });
    }

    assertCreator(body!.snapshot, actor);

    // Fetch the latest snapshot for diff computation before creating the new version.
    const versions = await listHuntVersions(huntId);
    let previousSnapshot: Record<string, unknown> | undefined;
    if (versions.length > 0) {
      const latest = await getHuntVersion(huntId, versions[0].version);
      if (latest) previousSnapshot = latest.snapshot;
    }

    const version = await createHuntVersion(huntId, body!.snapshot, actor);

    const diff = previousSnapshot ? computeDiff(previousSnapshot, body!.snapshot) : { created: true };
    await recordHuntAudit(huntId, "hunt edited", actor, diff);

    return NextResponse.json({ data: version }, { status: 201 });
  },
);
