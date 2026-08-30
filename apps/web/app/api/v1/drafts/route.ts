/**
 * Hunt Drafts API — collection endpoint
 *
 * GET  /api/v1/drafts?ownerKey=<wallet>   — list all drafts for a wallet
 * POST /api/v1/drafts                     — upsert (create or replace) a draft
 */

import { NextResponse } from 'next/server';

import { withErrorHandling } from '@/lib/api/withErrorHandling';
import { withValidation } from '@/lib/api/withValidation';
import { ValidationError } from '@/lib/api/errors';
import { getDb } from '@/lib/db';
import type { HuntDraftSave } from '@/lib/types';
import { draftUpsertBodySchema, draftListQuerySchema } from '@hunty/types/api-schemas';

// ── GET /api/v1/drafts?ownerKey=<wallet> ────────────────────────────────────

export const GET = withErrorHandling(async (req: Request) => {
  const url = new URL(req.url);
  const queryResult = draftListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries())
  );
  if (!queryResult.success) {
    throw new ValidationError('ownerKey query parameter is required');
  }

  const { ownerKey } = queryResult.data;

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
    WHERE owner_key = ${ownerKey}
    ORDER BY saved_at DESC
  `;

  const drafts: HuntDraftSave[] = rows.map((row) => ({
    ...row.payload,
    draftId: row.draft_id,
    label: row.label,
    savedAt: row.saved_at.toISOString(),
    recovered: row.recovered,
  }));

  return NextResponse.json({ drafts });
});

// ── POST /api/v1/drafts ──────────────────────────────────────────────────────

export const POST = withValidation(
  { body: draftUpsertBodySchema },
  async (_req, _context, { body }) => {
    const { ownerKey, draftId, label, savedAt, hunts, rewards, meta, recovered } = body;

    const payload: HuntDraftSave = {
      draftId,
      label: label ?? 'Untitled Draft',
      savedAt: savedAt ?? new Date().toISOString(),
      hunts,
      rewards: rewards ?? [],
      meta: meta ?? {
        gameName: '',
        startDate: '',
        endDate: '',
        timezone: '',
        category: '',
        rewardType: 'XLM',
      },
      recovered: recovered ?? false,
    };

    const sql = getDb();
    await sql`
      INSERT INTO hunt_drafts (draft_id, owner_key, label, payload, saved_at, recovered)
      VALUES (
        ${draftId},
        ${ownerKey},
        ${payload.label},
        ${sql.json(payload)},
        ${new Date(payload.savedAt)},
        ${payload.recovered}
      )
      ON CONFLICT (draft_id) DO UPDATE
        SET owner_key = EXCLUDED.owner_key,
            label     = EXCLUDED.label,
            payload   = EXCLUDED.payload,
            saved_at  = EXCLUDED.saved_at,
            recovered = EXCLUDED.recovered
    `;

    return NextResponse.json({ draftId, saved: true }, { status: 200 });
  }
);
