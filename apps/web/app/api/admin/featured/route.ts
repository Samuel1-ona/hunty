import { NextResponse } from 'next/server';

import { withErrorHandling } from '@/lib/api/withErrorHandling';
import { withValidation } from '@/lib/api/withValidation';
import { assertAdminAuth } from '@/lib/api/adminAuth';
import { readFeaturedId, writeFeaturedId } from '@/lib/featuredHuntDb';
import { adminFeaturedBodySchema } from '@hunty/types/api-schemas';

/**
 * GET /api/admin/featured
 *
 * Returns the currently featured hunt ID, read directly from the database so
 * that all instances always serve the same value.
 */
export const GET = withErrorHandling(async (req: Request) => {
  assertAdminAuth(req);
  const featuredHuntId = await readFeaturedId();
  return NextResponse.json({ featuredHuntId });
});

/**
 * POST /api/admin/featured
 *
 * Body: { huntId: number | null }
 *
 * Persists the featured hunt ID to the database.  Any database failure
 * propagates as an HTTP 500 rather than being silently ignored.
 */
export const POST = withValidation(
  { body: adminFeaturedBodySchema },
  async (req, _context, { body }) => {
    assertAdminAuth(req);
    await writeFeaturedId(body.huntId ?? null);
    return NextResponse.json({ success: true, featuredHuntId: body.huntId ?? null });
  }
);
