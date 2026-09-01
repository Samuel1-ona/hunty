import { NextResponse } from "next/server";
import { z } from "zod";

import { ForbiddenError, ValidationError } from "@/lib/api/errors";
import { withValidation } from "@/lib/api/withValidation";
import { getHuntVersion, listHuntVersions } from "@/lib/db/huntVersions";
import { huntVersionsQuerySchema } from "@hunty/types/api-schemas";

const paramsSchema = z.object({ id: z.string() });

function parseHuntId(id: string): number {
  const huntId = Number(id);
  if (!Number.isInteger(huntId) || huntId <= 0) throw new ValidationError("Invalid hunt ID", { id });
  return huntId;
}

function assertCreator(snapshot: Record<string, unknown>, actorAddress: string): void {
  const creator = snapshot.creator ?? snapshot.ownerAddress;
  if (typeof creator !== "string" || creator !== actorAddress) {
    throw new ForbiddenError("Only the hunt creator can manage versions");
  }
}

export const GET = withValidation(
  { query: huntVersionsQuerySchema, params: paramsSchema },
  async (_req, _context, { query, params }) => {
    const huntId = parseHuntId(params!.id);
    const versions = await listHuntVersions(huntId);
    if (versions.length > 0) {
      const latest = await getHuntVersion(huntId, versions[0].version);
      if (latest) assertCreator(latest.snapshot, query!.actorAddress);
    }
    return NextResponse.json({ data: versions, retentionDays: 90 });
  },
);
