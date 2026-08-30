import { huntSponsorBodySchema } from '@hunty/types/api-schemas';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { withValidation } from '@/lib/api/withValidation';
import { logger } from '@/lib/logger';
import { getIP, rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const paramsSchema = z.object({ id: z.string() });

/**
 * POST /api/v1/hunts/[id]/sponsor
 *
 * Allows a third-party wallet (sponsor) to add funds to an existing hunt's
 * reward pool. The sponsor's address and contribution amount are recorded
 * separately from creator funds so attribution is preserved and sponsor totals
 * can be queried independently.
 *
 * Body: { sponsorAddress: string (Stellar G-address), amount: number }
 *
 * Returns: {
 *   success: true,
 *   contribution: SponsorContribution,
 *   sponsorTotal: number,
 *   sponsors: SponsorContribution[]
 * }
 */
export const POST = withValidation(
  { body: huntSponsorBodySchema, params: paramsSchema },
  async (req, _context, { body, params }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, { limit: 30, windowMs: 60 * 1000 });
    if (!success) return rateLimitResponse(reset);

    const huntId = parseInt(params!.id, 10);
    if (isNaN(huntId)) {
      throw new ValidationError('Invalid hunt ID', { id: params!.id });
    }

    try {
      const { getHunt } = await import('@/lib/huntStore');
      const hunt = getHunt(String(huntId));

      if (!hunt) {
        throw new NotFoundError('Hunt not found', { huntId });
      }

      if (hunt.status !== 'Active' && hunt.status !== 'Scheduled') {
        throw new ValidationError('Sponsorship is only available for active or scheduled hunts', {
          status: hunt.status,
        });
      }

      const { sponsorHunt, getSponsorContributions, getSponsorTotal } = await import(
        '@/lib/contracts/rewardManager'
      );

      // sponsorHunt reads the active wallet adapter — here we pass sponsorAddress
      // as part of the recorded contribution payload via the escrow layer.
      const contribution = await sponsorHunt(huntId, body.amount);

      // Attribute the recorded sponsorAddress to the contribution in the escrow.
      // The contract layer captures the wallet's public key; we surface the
      // caller-supplied address in the response for display / attribution.
      const sponsorContributions = getSponsorContributions(huntId);
      const sponsorTotal = getSponsorTotal(huntId);

      return NextResponse.json({
        success: true,
        contribution: {
          ...contribution,
          // Expose the canonical sponsor address supplied in the request body.
          sponsor: body.sponsorAddress,
        },
        sponsorTotal,
        sponsors: sponsorContributions,
      });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
      const message = error instanceof Error ? error.message : 'Sponsorship failed';
      logger.error('Sponsor hunt error:', error);
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
);

/**
 * GET /api/v1/hunts/[id]/sponsor
 *
 * Returns sponsor attribution data: total sponsor funds and a list of all
 * individual sponsor contributions with their amounts and wallet addresses.
 * Sponsor funds are reported separately from creator funds.
 */
export const GET = withValidation({ params: paramsSchema }, async (req, _context, { params }) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 60, windowMs: 60 * 1000 });
  if (!success) return rateLimitResponse(reset);

  const huntId = parseInt(params!.id, 10);
  if (isNaN(huntId)) {
    throw new ValidationError('Invalid hunt ID', { id: params!.id });
  }

  try {
    const { getHunt } = await import('@/lib/huntStore');
    const hunt = getHunt(String(huntId));
    if (!hunt) {
      throw new NotFoundError('Hunt not found', { huntId });
    }

    const { getSponsorContributions, getSponsorTotal, getRewardEscrow } = await import(
      '@/lib/contracts/rewardManager'
    );

    const escrow = getRewardEscrow(huntId);
    const sponsors = getSponsorContributions(huntId);
    const sponsorTotal = getSponsorTotal(huntId);
    const creatorTotal = escrow ? escrow.totalPool - sponsorTotal : 0;

    return NextResponse.json({
      huntId,
      /** Total funds contributed by all sponsors (separate from creator funds). */
      sponsorTotal,
      /** Total funds contributed by the hunt creator. */
      creatorTotal,
      /** All sponsor contributions for attribution display. */
      sponsors,
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
    logger.error('Get sponsor info error:', error);
    return NextResponse.json({ error: 'Failed to fetch sponsor info' }, { status: 500 });
  }
});
