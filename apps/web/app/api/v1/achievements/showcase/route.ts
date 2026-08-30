import { achievementShowcaseBodySchema, stellarAddressSchema } from '@hunty/types/api-schemas';
import { NextResponse } from 'next/server';

import {
  getPublicPinnedAchievements,
  savePinnedAchievements,
} from '@/lib/achievements/showcaseStore';
import { ForbiddenError, ValidationError } from '@/lib/api/errors';
import { withErrorHandling } from '@/lib/api/withErrorHandling';
import { withValidation } from '@/lib/api/withValidation';

/** Public profile readers only receive achievement IDs, never the owner secret. */
export const GET = withErrorHandling(async (request: Request) => {
  const address = new URL(request.url).searchParams.get('address');
  const parsed = stellarAddressSchema.safeParse(address);
  if (!parsed.success) {
    throw new ValidationError('A valid wallet address is required', { field: 'address' });
  }

  return NextResponse.json({ pinned: await getPublicPinnedAchievements(parsed.data) });
});

/**
 * Saves a profile showcase. The first save mints an owner secret; later saves
 * require it, matching the app's established wallet-ownership fallback.
 */
export const PUT = withValidation(
  { body: achievementShowcaseBodySchema },
  async (_request, _context, { body }) => {
    const saved = await savePinnedAchievements(body.address, body.pinned, body.ownerSecret);
    if (!saved) {
      throw new ForbiddenError(
        'A valid ownerSecret is required to update this achievement showcase'
      );
    }

    return NextResponse.json(saved);
  }
);
