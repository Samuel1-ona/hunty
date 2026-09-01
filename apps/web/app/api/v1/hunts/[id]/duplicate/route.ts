/**
 * POST /api/v1/hunts/[id]/duplicate
 *
 * Duplicates a hunt as a new Draft event.
 *
 * Request:
 *   Path: id (hunt ID)
 *   Body: { creatorAddress: string }
 *
 * Response:
 *   { data: StoredHunt } (the newly created duplicate)
 *
 * Errors:
 *   400 - Invalid hunt ID
 *   401 - Missing creator address
 *   403 - Not authorized to duplicate this hunt
 *   404 - Hunt not found
 *   500 - Server error
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { withValidation } from "@/lib/api/withValidation";
import { ValidationError, UnauthorizedError } from "@/lib/api/errors";
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getCreatorHunts } from "@/lib/huntStore";
import { duplicateHuntAsDraft } from "@/lib/huntDuplication";

const paramsSchema = z.object({
  id: z.string(),
});

const bodySchema = z.object({
  creatorAddress: z.string().min(1, "Creator address is required"),
});

export const POST = withValidation(
  {
    body: bodySchema,
    params: paramsSchema,
  },
  async (req, { params: paramsPromise }, { body }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, { limit: 20, windowMs: 60 * 1000 });

    if (!success) {
      return rateLimitResponse(reset);
    }

    const { id } = await paramsPromise;
    const huntId = parseInt(id, 10);

    if (isNaN(huntId)) {
      throw new ValidationError("Invalid hunt ID", { id });
    }

    const { creatorAddress } = body;

    if (!creatorAddress || creatorAddress.trim().length === 0) {
      throw new UnauthorizedError("Creator address is required");
    }

    // Get all hunts to pass to duplication service
    const allHunts = getCreatorHunts();

    // Call the duplication service
    const duplicate = duplicateHuntAsDraft(huntId, creatorAddress, allHunts);

    return NextResponse.json(
      {
        data: duplicate,
        message: "Hunt duplicated successfully as a draft",
      },
      { status: 201 }
    );
  }
);
