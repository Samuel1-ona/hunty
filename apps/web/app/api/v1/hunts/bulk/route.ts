import { NextResponse } from 'next/server';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { withValidation } from '@/lib/api/withValidation';
import { huntsBulkBodySchema } from '@hunty/types/api-schemas';

/**
 * POST /api/v1/hunts/bulk
 * Bulk operations on multiple hunts (archive, delete, restore).
 */
export const POST = withValidation(
  { body: huntsBulkBodySchema },
  async (req, _context, { body }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, { limit: 30, windowMs: 60 * 1000 });
    if (!success) return rateLimitResponse(reset);

    const ids = body.huntIds.map((id) =>
      typeof id === 'string' ? parseInt(id, 10) : (id as number)
    );

    if (ids.some((id) => isNaN(id))) {
      return NextResponse.json({ error: 'Invalid hunt ID in list' }, { status: 400 });
    }

    try {
      if (body.action === 'archive') {
        const { hideHuntsFromPublic } = await import('@/lib/huntStore');
        hideHuntsFromPublic(ids);
        return NextResponse.json({
          success: true,
          message: `${ids.length} hunt(s) archived successfully`,
        });
      } else if (body.action === 'unarchive') {
        const { unhideHuntsFromPublic } = await import('@/lib/huntStore');
        unhideHuntsFromPublic(ids);
        return NextResponse.json({
          success: true,
          message: `${ids.length} hunt(s) unarchived successfully`,
        });
      } else if (body.action === 'soft-delete') {
        const { softDeleteHunts } = await import('@/lib/huntStore');
        softDeleteHunts(ids);
        return NextResponse.json({
          success: true,
          message: `${ids.length} hunt(s) soft-deleted successfully. You can restore them within 30 days.`,
        });
      } else if (body.action === 'restore') {
        const { restoreHunts } = await import('@/lib/huntStore');
        restoreHunts(ids);
        return NextResponse.json({
          success: true,
          message: `${ids.length} hunt(s) restored successfully`,
        });
      } else if (body.action === 'permanent-delete') {
        if (!body.confirmed) {
          return NextResponse.json(
            {
              error: 'Confirmation required. Set confirmed=true to permanently delete.',
            },
            { status: 400 }
          );
        }
        const { permanentDeleteHunts } = await import('@/lib/huntStore');
        permanentDeleteHunts(ids);
        return NextResponse.json({
          success: true,
          message: `${ids.length} hunt(s) permanently deleted. This action cannot be undone.`,
        });
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
      logger.error('Bulk hunt operation error:', error);
      return NextResponse.json({ error: 'Failed to perform bulk operation' }, { status: 500 });
    }
  }
);
