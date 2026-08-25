import { NextResponse } from "next/server";

import { getHuntById } from "@/lib/huntStore";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/v1/hunts/[id]
 * Get hunt details by ID.
 */
export const GET = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (req, { params }) => {
    const ip = getIP(req);
    const { success, reset } = rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });

    if (!success) {
      return rateLimitResponse(reset);
    }

    const { id } = await params;
    const huntId = parseInt(id, 10);

    if (isNaN(huntId)) {
      throw new ValidationError("Invalid hunt ID", { id });
    }

    const hunt = getHuntById(huntId);

    if (!hunt) {
      throw new NotFoundError("Hunt not found", { huntId });
    }

    // Public endpoint should only expose public hunts if we follow the list's logic.
    if (hunt.is_private) {
      throw new ForbiddenError("Access denied. This hunt is private.", { huntId });
    }

    return NextResponse.json({ data: hunt });
  }
);
 