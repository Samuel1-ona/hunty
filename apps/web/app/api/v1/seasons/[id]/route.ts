import { NextResponse } from 'next/server';
import {
  getSeasonById,
  updateSeasonStatus,
  archiveSeason,
  getCurrentSeasonLeaderboard,
} from '@/lib/seasonStore';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { withErrorHandling } from '@/lib/api/withErrorHandling';
import { withValidation } from '@/lib/api/withValidation';
import type { SeasonStatus } from '@/lib/types';
import { seasonArchiveBodySchema, seasonPatchBodySchema } from '@hunty/types/api-schemas';
import { z } from 'zod';

type Context = { params: Promise<{ id: string }> };

const paramsSchema = z.object({ id: z.string() });

/**
 * GET /api/v1/seasons/[id]
 * Get a specific season by ID
 */
export const GET = withErrorHandling(async (req: Request, context: Context) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });
  if (!success) return rateLimitResponse(reset);

  const { id } = await context.params;
  const seasonId = parseInt(id, 10);
  if (isNaN(seasonId)) {
    throw new ValidationError('Invalid season ID', { id });
  }

  const season = getSeasonById(seasonId);
  if (!season) {
    throw new NotFoundError('Season not found', { seasonId });
  }

  const leaderboard = getCurrentSeasonLeaderboard();
  const now = Math.floor(Date.now() / 1000);
  const timeRemaining = season.status === 'Active' ? Math.max(0, season.endTime - now) : 0;

  return NextResponse.json({ season, leaderboard, timeRemaining });
});

/**
 * PATCH /api/v1/seasons/[id]
 * Update season status (admin only)
 */
export const PATCH = withValidation(
  { body: seasonPatchBodySchema, params: paramsSchema },
  async (req, _context, { body, params }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, { limit: 10, windowMs: 60 * 1000 });
    if (!success) return rateLimitResponse(reset);

    const seasonId = parseInt(params!.id, 10);
    if (isNaN(seasonId)) {
      throw new ValidationError('Invalid season ID', { id: params!.id });
    }

    if (body.status) {
      updateSeasonStatus(seasonId, body.status as SeasonStatus);
    }

    const updatedSeason = getSeasonById(seasonId);
    if (!updatedSeason) {
      throw new NotFoundError('Season not found', { seasonId });
    }

    return NextResponse.json({ season: updatedSeason });
  }
);

/**
 * POST /api/v1/seasons/[id]
 * Archive a season with its final leaderboard
 */
export const POST = withValidation(
  { body: seasonArchiveBodySchema, params: paramsSchema },
  async (req, _context, { body, params }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, { limit: 5, windowMs: 60 * 1000 });
    if (!success) return rateLimitResponse(reset);

    const seasonId = parseInt(params!.id, 10);
    if (isNaN(seasonId)) {
      throw new ValidationError('Invalid season ID', { id: params!.id });
    }

    const archived = archiveSeason(seasonId, body.finalLeaderboard);
    return NextResponse.json({ archived }, { status: 200 });
  }
);
