/**
 * Hunt Drafts API — individual draft endpoint
 *
 * GET    /api/v1/drafts/:draftId                      — fetch one draft
 * PATCH  /api/v1/drafts/:draftId  { recovered: true } — mark as recovered
 * DELETE /api/v1/drafts/:draftId                      — delete a draft
 */

import { NextResponse } from "next/server";

import { NotFoundError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { withValidation } from "@/lib/api/withValidation";
import { getDb } from "@/lib/db";
import type { HuntDraftSave } from "@/lib/types";
import { draftPatchBodySchema } from "@hunty/types/api-schemas";
import { z } from "zod";

type Context = { params: Promise<{ draftId: string }> };

const paramsSchema = z.object({ draftId: z.string() });

// ── GET /api/v1/drafts/:draftId ──────────────────────────────────────────────

export const GET = withErrorHandling(async (_req: Request, context: Context) => {
  const { draftId } = await context.params;
  const sql = getDb();

  const rows = await sql<
    {
      draft_id: string;
      owner_key: string;
      label: string;
      payload: HuntDraftSave;
      saved_at: Date;
      recovered: boolean;
    }[]
  >`
    SELECT draft_id, owner_key, label, payload, saved_at, recovered
    FROM hunt_drafts
    WHERE draft_id = ${draftId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    throw new NotFoundError(`Draft ${draftId} not found`);
  }

  const row = rows[0];
  const draft: HuntDraftSave = {
    ...row.payload,
    draftId: row.draft_id,
    label: row.label,
    savedAt: row.saved_at.toISOString(),
    recovered: row.recovered,
  };

  return NextResponse.json({ draft });
});

// ── PATCH /api/v1/drafts/:draftId ────────────────────────────────────────────

export const PATCH = withValidation(
  { body: draftPatchBodySchema, params: paramsSchema },
  async (_req, _context, { body, params }) => {
    const sql = getDb();

    const rows = await sql`
      UPDATE hunt_drafts
      SET recovered = ${body.recovered ?? true}
      WHERE draft_id = ${params!.draftId}
      RETURNING draft_id
    `;

    if (rows.length === 0) {
      throw new NotFoundError(`Draft ${params!.draftId} not found`);
    }

    return NextResponse.json({ draftId: params!.draftId, updated: true });
  }
);

// ── DELETE /api/v1/drafts/:draftId ───────────────────────────────────────────

export const DELETE = withErrorHandling(async (_req: Request, context: Context) => {
  const { draftId } = await context.params;
  const sql = getDb();

  await sql`DELETE FROM hunt_drafts WHERE draft_id = ${draftId}`;

  return NextResponse.json({ draftId, deleted: true });
});
