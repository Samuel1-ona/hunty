/**
 * Hunt Drafts API — collection endpoint
 *
 * GET  /api/v1/drafts?ownerKey=<wallet>   — list all drafts for a wallet
 * POST /api/v1/drafts                     — upsert (create or replace) a draft
 *
 * This endpoint is the server-side complement to the cloud-sync stub in
 * hooks/useHuntDraftAutoSave.ts.  Drafts are stored in the `hunt_drafts`
 * PostgreSQL table (migration 005_create_hunt_drafts.sql) so they survive
 * deploys, instance recycling, and browser clears.
 */

import { NextResponse } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { withAuth } from "@/lib/api/withAuth";
import { getDb } from "@/lib/db";
import type { HuntDraftSave } from "@/lib/types";

// ── GET /api/v1/drafts?ownerKey=<wallet> ────────────────────────────────────

async function handleGet(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const ownerKey = url.searchParams.get("ownerKey");

  if (!ownerKey) {
    throw new ValidationError("ownerKey query parameter is required");
  }

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
}

// ── POST /api/v1/drafts ──────────────────────────────────────────────────────

async function handlePost(req: Request): Promise<NextResponse> {
  const body = (await req.json()) as Partial<HuntDraftSave> & { ownerKey?: string };

  const { ownerKey, draftId, label, savedAt, hunts, rewards, meta, recovered } = body;

  if (!ownerKey || typeof ownerKey !== "string") {
    throw new ValidationError("ownerKey is required");
  }
  if (!draftId || typeof draftId !== "string") {
    throw new ValidationError("draftId is required");
  }
  if (!hunts || !Array.isArray(hunts)) {
    throw new ValidationError("hunts array is required");
  }

  const payload: HuntDraftSave = {
    draftId,
    label: label ?? "Untitled Draft",
    savedAt: savedAt ?? new Date().toISOString(),
    hunts,
    rewards: rewards ?? [],
    meta: meta ?? {
      gameName: "",
      startDate: "",
      endDate: "",
      timezone: "",
      category: "",
      rewardType: "XLM",
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

// ── Route exports ────────────────────────────────────────────────────────────
//
// Both accept an `ownerKey` (a wallet address) already — withAuth just
// centralizes "is a wallet identity present" instead of leaving GET/POST to
// enforce it (or not) independently. See lib/api/withAuth.ts.

export const GET = withErrorHandling(withAuth(handleGet));
export const POST = withErrorHandling(withAuth(handlePost));
