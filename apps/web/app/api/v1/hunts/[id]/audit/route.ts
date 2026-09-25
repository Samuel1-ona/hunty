import { NextResponse } from "next/server";
import { z } from "zod";

import { ForbiddenError, ValidationError } from "@/lib/api/errors";
import { withValidation } from "@/lib/api/withValidation";
import { getHuntAuditLog, getHuntAuditLogCount } from "@/lib/db/huntAuditLog";

const paramsSchema = z.object({ id: z.string() });
const querySchema = z.object({
  actorAddress: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

function parseHuntId(id: string): number {
  const huntId = Number(id);
  if (!Number.isInteger(huntId) || huntId <= 0) throw new ValidationError("Invalid hunt ID", { id });
  return huntId;
}

export const GET = withValidation(
  { query: querySchema, params: paramsSchema },
  async (_req, _context, { query, params }) => {
    const huntId = parseHuntId(params!.id);
    const [entries, total] = await Promise.all([
      getHuntAuditLog(huntId, query!.limit, query!.offset),
      getHuntAuditLogCount(huntId),
    ]);
    return NextResponse.json({ data: entries, total, limit: query!.limit, offset: query!.offset });
  },
);
