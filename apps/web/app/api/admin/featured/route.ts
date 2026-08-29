import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { withAdminAuth } from "@/lib/api/withAuth";
import { readFeaturedId, writeFeaturedId } from "@/lib/featuredHuntDb";

/**
 * GET /api/admin/featured
 *
 * Returns the currently featured hunt ID, read directly from the database so
 * that all instances always serve the same value.
 */
export const GET = withErrorHandling(
  withAdminAuth(async () => {
    const featuredHuntId = await readFeaturedId();
    return NextResponse.json({ featuredHuntId });
  })
);

/**
 * POST /api/admin/featured
 *
 * Body: { huntId: number | null }
 *
 * Persists the featured hunt ID to the database.  Any database failure
 * propagates as an HTTP 500 rather than being silently ignored.
 */
export const POST = withErrorHandling(
  withAdminAuth(async (req: NextRequest) => {
    let body: { huntId?: number | null };
    try {
      body = (await req.json()) as { huntId: number | null };
    } catch {
      throw new ValidationError("Invalid request payload");
    }

    const { huntId } = body;
    await writeFeaturedId(huntId ?? null);

    return NextResponse.json({ success: true, featuredHuntId: huntId ?? null });
  })
);
