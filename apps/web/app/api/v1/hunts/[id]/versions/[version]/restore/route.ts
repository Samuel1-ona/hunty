import { huntVersionRestoreBodySchema } from '@hunty/types/api-schemas';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { withValidation } from '@/lib/api/withValidation';
import { createHuntVersion, getHuntVersion } from '@/lib/db/huntVersions';

const paramsSchema = z.object({ id: z.string(), version: z.string() });

function parseParams(id: string, version: string): { huntId: number; version: number } {
  const huntId = Number(id);
  const versionNumber = Number(version);
  if (
    !Number.isInteger(huntId) ||
    huntId <= 0 ||
    !Number.isInteger(versionNumber) ||
    versionNumber <= 0
  ) {
    throw new ValidationError('Invalid hunt version', { id, version });
  }
  return { huntId, version: versionNumber };
}

export const POST = withValidation(
  { body: huntVersionRestoreBodySchema, params: paramsSchema },
  async (_req, _context, { body, params }) => {
    const { huntId, version } = parseParams(params!.id, params!.version);
    const selected = await getHuntVersion(huntId, version);
    if (!selected) throw new NotFoundError('Hunt version not found', { huntId, version });

    const creator = selected.snapshot.creator ?? selected.snapshot.ownerAddress;
    if (creator !== body!.actorAddress) {
      throw new ForbiddenError('Only the hunt creator can restore versions');
    }

    const restored = await createHuntVersion(huntId, selected.snapshot, body!.actorAddress);
    return NextResponse.json({ data: restored, restoredFrom: version });
  }
);
