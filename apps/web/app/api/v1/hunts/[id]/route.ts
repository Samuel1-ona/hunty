import { NextResponse } from "next/server";
import { z } from "zod";

import { getPublicHuntByIdOptimized } from "@/lib/db/queryOptimizer";
import { createHuntVersion } from "@/lib/db/huntVersions";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { withValidation } from "@/lib/api/withValidation";
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { huntVersionEditBodySchema } from "@hunty/types/api-schemas";

const paramsSchema = z.object({ id: z.string() });

function assertCreator(snapshot: Record<string, unknown>, actorAddress: string): void {
  const creator = snapshot.creator ?? snapshot.ownerAddress;
  if (typeof creator !== "string" || creator !== actorAddress) {
    throw new ForbiddenError("Only the hunt creator can edit this hunt");
  }
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
  async (_req, _context, { body, params }) => {
    const huntId = Number(params!.id);
    if (!Number.isInteger(huntId) || huntId <= 0 || body!.snapshot.id !== huntId) {
      throw new ValidationError("Invalid hunt ID", { id: params!.id });
    }

    assertCreator(body!.snapshot, body!.actorAddress);
    const version = await createHuntVersion(huntId, body!.snapshot, body!.actorAddress);
    return NextResponse.json({ data: version }, { status: 201 });
  },
);
