import { referralTrackBodySchema } from '@hunty/types/api-schemas';
import { NextResponse } from 'next/server';

import { withValidation } from '@/lib/api/withValidation';
import { getIP, rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { recordReferral } from '@/lib/referralStore';

const SELF_REFERRAL_REASONS = new Set([
  'self_referral_wallet',
  'self_referral_ip',
  'self_referral_session',
]);

/**
 * POST /api/v1/referrals/track
 *
 * Records a referral after enforcing strict anti-self-referral validation:
 *  1. Wallet address match (referrer === referred) → 409
 *  2. IP address match                             → 409
 *  3. Session ID match                             → 409
 *  4. Already referred wallet                      → 200 (idempotent)
 *
 * Request body: { code, referrerAddress, referredAddress, sessionId?, huntId? }
 */
export const POST = withValidation(
  { body: referralTrackBodySchema },
  async (req: Request, _context, { body }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, { limit: 30, windowMs: 60_000 });
    if (!success) return rateLimitResponse(reset);

    const result = recordReferral({
      code: body.code,
      referrerAddress: body.referrerAddress,
      referredAddress: body.referredAddress,
      huntId: body.huntId,
      clientIp: ip,
      sessionId: body.sessionId ?? null,
    });

    if (!result.success) {
      // Self-referral attempts are logged as 409 Conflict
      if (SELF_REFERRAL_REASONS.has(result.reason)) {
        return NextResponse.json(
          {
            error: 'Self-referral not allowed',
            code: 'SELF_REFERRAL_BLOCKED',
            reason: result.reason,
          },
          { status: 409 }
        );
      }

      // Already referred — idempotent success
      if (result.reason === 'already_referred') {
        return NextResponse.json({ ok: true, alreadyExists: true }, { status: 200 });
      }

      return NextResponse.json(
        { error: 'Referral could not be recorded', reason: result.reason },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, record: result.record }, { status: 201 });
  }
);
