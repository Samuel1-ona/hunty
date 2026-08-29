/**
 * Hunt Drafts API — individual draft endpoint
 *
 * GET    /api/v1/drafts/:draftId                      — fetch one draft
 * PATCH  /api/v1/drafts/:draftId  { recovered: true } — mark as recovered
 * DELETE /api/v1/drafts/:draftId                      — delete a draft
 *
 * None of these carry an owner-identifying field in the request today (only
 * `draftId`), so knowing/guessing a draft ID alone used to be enough to
 * read, modify, or delete anyone's unpublished draft (IDOR). This route
 * isn't called anywhere in the current frontend (only `POST /api/v1/drafts`
 * is used, via hooks/useHuntDraftAutoSave.ts), so gating it more strictly
 * here doesn't risk breaking a live flow.
 *
 * `withAuth` requires an `x-wallet-address` header, and the handlers below
 * additionally verify that identity actually owns the draft row
 * (`auth.identity === row.owner_key`) before allowing read/update/delete —
 * real ownership authorization, not just "some identity was presented".
 */

import { NextResponse } from "next/server";

import { ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { type AuthContext, withAuth } from "@/lib/api/withAuth";
import { getDb } from "@/lib/db";
import type { HuntDraftSave } from "@/lib/types";

type Context = { params: Promise<{ draftId: string }> };

type DraftRow = {
  draft_id: string;
  owner_key: string;
  label: string;
  payload: HuntDraftSave;
  saved_at: Date;
  recovered: boolean;
};

async function loadOwnedDraftRow(draftId: string, auth: AuthContext): Promise<DraftRow> {
  const sql = getDb();
  const rows = await sql<DraftRow[]>`
    SELECT draft_id, owner_key, label, payload, saved_at, recovered
    FROM hunt_drafts
    WHERE draft_id = ${draftId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    throw new NotFoundError(`Draft ${draftId} not found`);
  }

  if (rows[0].owner_key !== auth.identity) {
    throw new ForbiddenError("You do not have access to this draft");
  }

  return rows[0];
}

// ── GET /api/v1/drafts/:draftId ──────────────────────────────────────────────

async function handleGet(_req: Request, context: Context, auth: AuthContext): Promise<NextResponse> {
  const { draftId } = await context.params;
  const row = await loadOwnedDraftRow(draftId, auth);

  const draft: HuntDraftSave = {
    ...row.payload,
    draftId: row.draft_id,
    label: row.label,
    savedAt: row.saved_at.toISOString(),
    recovered: row.recovered,
  };

  return NextResponse.json({ draft });
}

// ── PATCH /api/v1/drafts/:draftId ────────────────────────────────────────────

async function handlePatch(req: Request, context: Context, auth: AuthContext): Promise<NextResponse> {
  const { draftId } = await context.params;
  await loadOwnedDraftRow(draftId, auth);

  const body = (await req.json()) as { recovered?: boolean };
  const sql = getDb();

  const rows = await sql`
    UPDATE hunt_drafts
    SET recovered = ${body.recovered ?? true}
    WHERE draft_id = ${draftId}
    RETURNING draft_id
  `;

  if (rows.length === 0) {
    throw new NotFoundError(`Draft ${draftId} not found`);
  }

  return NextResponse.json({ draftId, updated: true });
}

// ── DELETE /api/v1/drafts/:draftId ───────────────────────────────────────────

async function handleDelete(_req: Request, context: Context, auth: AuthContext): Promise<NextResponse> {
  const { draftId } = await context.params;
  await loadOwnedDraftRow(draftId, auth);

  const sql = getDb();
  await sql`DELETE FROM hunt_drafts WHERE draft_id = ${draftId}`;

  return NextResponse.json({ draftId, deleted: true });
}

// ── Route exports ────────────────────────────────────────────────────────────

export const GET = withErrorHandling(withAuth(handleGet as Parameters<typeof withAuth>[0]));
export const PATCH = withErrorHandling(withAuth(handlePatch as Parameters<typeof withAuth>[0]));
export const DELETE = withErrorHandling(withAuth(handleDelete as Parameters<typeof withAuth>[0]));
