import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { withValidation } from "@/lib/api/withValidation";
import { createHuntVersion, getHuntVersion } from "@/lib/db/huntVersions";
import { huntVersionRestoreBodySchema } from "@hunty/types/api-schemas";
import { verifyCallerAuth } from "@/lib/walletAuth";

const paramsSchema = z.object({ id: z.string(), version: z.string() });

function parseParams(id: string, version: string): { huntId: number; version: number } {
  const huntId = Number(id);
  const versionNumber = Number(version);
  if (!Number.isInteger(huntId) || huntId <= 0 || !Number.isInteger(versionNumber) || versionNumber <= 0) {
    throw new ValidationError("Invalid hunt version", { id, version });
  }
  return { huntId, version: versionNumber };
}

export const POST = withValidation(
  { body: huntVersionRestoreBodySchema, params: paramsSchema },
  async (req, _context, { params }) => {
    // Privileged write: reject unauthenticated callers before touching state.
    const auth = await verifyCallerAuth(req as NextRequest);
    if (!auth.authenticated) {
      throw new AuthError(auth.error ?? "Authentication required");
    }
    if (!auth.authorized) {
      throw new ForbiddenError(auth.error ?? "Access denied");
    }

    // The actor is derived from the verified wallet/session, never from the body.
    const actor = auth.actor ?? "";

    const { huntId, version } = parseParams(params!.id, params!.version);
    const selected = await getHuntVersion(huntId, version);
    if (!selected) throw new NotFoundError("Hunt version not found", { huntId, version });

    const creator = selected.snapshot.creator ?? selected.snapshot.ownerAddress;
    if (creator !== actor) {
      throw new ForbiddenError("Only the hunt creator can restore versions");
    }

    const restored = await createHuntVersion(huntId, selected.snapshot, actor);
    return NextResponse.json({ data: restored, restoredFrom: version });
  },
);
