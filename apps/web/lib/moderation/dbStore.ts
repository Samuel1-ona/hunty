/**
 * PostgreSQL-backed moderation store.
 *
 * All reads and writes go through the shared PostgreSQL database, which means:
 *  - Moderation decisions are consistent across every serverless instance.
 *  - Decisions survive deploys and instance recycling.
 *  - Failures propagate as thrown errors instead of being silently swallowed.
 *
 * This replaces the previous file-based JSON store (lib/moderation-data/*.json)
 * which was per-instance on serverless platforms and lost on every deploy.
 *
 * Functions in this module are async. Callers (API route handlers) must await
 * them.
 */

import { randomUUID } from "crypto"
import * as Sentry from "@sentry/nextjs"
import { getDb } from "@/lib/db"
import { logger } from "@/lib/logger"
import type {
  AutoFlagReason,
  ContentPolicyViolation,
  CreatorModerationNotification,
  ModerationDecision,
  ModerationSubmission,
} from "./types"
import type { StoredHunt } from "@/lib/types"
import { scanHuntContent } from "./autoFlag"

// ---------------------------------------------------------------------------
// Row types — map directly to the PostgreSQL columns.
// ---------------------------------------------------------------------------

interface SubmissionRow {
  id: string
  hunt_id: number
  hunt: string
  status: string
  submitted_at: number
  submitted_by: string | null
  reviewed_at: number | null
  reviewed_by: string | null
  rejection_reason: string | null
  auto_flags: string[]
  policy_violations: string[]
  creator_email: string | null
}

interface NotificationRow {
  id: string
  hunt_id: number
  hunt_title: string
  action: string
  reason: string | null
  creator_email: string | null
  created_at: number
  read: boolean
}

// ---------------------------------------------------------------------------
// Conversion helpers — row ↔ domain type.
// ---------------------------------------------------------------------------

function rowToSubmission(row: SubmissionRow): ModerationSubmission {
  return {
    id: row.id,
    huntId: row.hunt_id,
    hunt: JSON.parse(row.hunt) as StoredHunt,
    status: row.status as ModerationDecision,
    submittedAt: row.submitted_at,
    ...(row.submitted_by !== null ? { submittedBy: row.submitted_by } : {}),
    ...(row.reviewed_at !== null ? { reviewedAt: row.reviewed_at } : {}),
    ...(row.reviewed_by !== null ? { reviewedBy: row.reviewed_by } : {}),
    ...(row.rejection_reason !== null ? { rejectionReason: row.rejection_reason } : {}),
    autoFlags: (row.auto_flags ?? []) as AutoFlagReason[],
    policyViolations: (row.policy_violations ?? []) as ContentPolicyViolation[],
    ...(row.creator_email !== null ? { creatorEmail: row.creator_email } : {}),
  }
}

function rowToNotification(row: NotificationRow): CreatorModerationNotification {
  return {
    id: row.id,
    huntId: row.hunt_id,
    huntTitle: row.hunt_title,
    action: row.action as "approved" | "rejected",
    ...(row.reason !== null ? { reason: row.reason } : {}),
    ...(row.creator_email !== null ? { creatorEmail: row.creator_email } : {}),
    createdAt: row.created_at,
    read: row.read,
  }
}

// ---------------------------------------------------------------------------
// Public API — same surface as the original store.ts, all async.
// ---------------------------------------------------------------------------

export async function getPendingSubmissions(): Promise<ModerationSubmission[]> {
  const sql = getDb()
  const rows = await sql<SubmissionRow[]>`
    SELECT * FROM moderation_submissions
    WHERE  status = 'pending'
    ORDER  BY submitted_at ASC
  `
  return rows.map(rowToSubmission)
}

export async function getAllSubmissions(): Promise<ModerationSubmission[]> {
  const sql = getDb()
  const rows = await sql<SubmissionRow[]>`
    SELECT * FROM moderation_submissions
    ORDER  BY submitted_at DESC
  `
  return rows.map(rowToSubmission)
}

export async function getSubmissionByHuntId(
  huntId: number,
): Promise<ModerationSubmission | undefined> {
  const sql = getDb()
  const rows = await sql<SubmissionRow[]>`
    SELECT * FROM moderation_submissions
    WHERE  hunt_id = ${huntId}
    ORDER  BY submitted_at DESC
    LIMIT  1
  `
  return rows.length > 0 ? rowToSubmission(rows[0]) : undefined
}

export async function submitHuntForModeration(
  hunt: StoredHunt,
  submittedBy?: string,
): Promise<ModerationSubmission> {
  const sql = getDb()

  // Skip duplicate pending submissions.
  const existing = await sql<SubmissionRow[]>`
    SELECT * FROM moderation_submissions
    WHERE  hunt_id = ${hunt.id} AND status = 'pending'
    LIMIT  1
  `
  if (existing.length > 0) {
    return rowToSubmission(existing[0])
  }

  const { autoFlags, policyViolations } = scanHuntContent(hunt)
  const id = randomUUID()
  const submittedAt = Date.now()

  await sql`
    INSERT INTO moderation_submissions
      (id, hunt_id, hunt, status, submitted_at, submitted_by, auto_flags, policy_violations, creator_email)
    VALUES
      (${id}, ${hunt.id}, ${JSON.stringify(hunt)}, 'pending', ${submittedAt},
       ${submittedBy ?? null}, ${autoFlags}, ${policyViolations}, ${hunt.creatorEmail ?? null})
  `

  return {
    id,
    huntId: hunt.id,
    hunt,
    status: "pending",
    submittedAt,
    ...(submittedBy ? { submittedBy } : {}),
    autoFlags,
    policyViolations,
    ...(hunt.creatorEmail ? { creatorEmail: hunt.creatorEmail } : {}),
  }
}

async function appendCreatorNotification(input: {
  huntId: number
  huntTitle: string
  action: "approved" | "rejected"
  reason?: string
  creatorEmail?: string
}): Promise<CreatorModerationNotification> {
  const sql = getDb()
  const id = randomUUID()
  const createdAt = Date.now()

  await sql`
    INSERT INTO moderation_notifications
      (id, hunt_id, hunt_title, action, reason, creator_email, created_at, read)
    VALUES
      (${id}, ${input.huntId}, ${input.huntTitle}, ${input.action},
       ${input.reason ?? null}, ${input.creatorEmail ?? null}, ${createdAt}, false)
  `

  return {
    id,
    huntId: input.huntId,
    huntTitle: input.huntTitle,
    action: input.action,
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
    ...(input.creatorEmail !== undefined ? { creatorEmail: input.creatorEmail } : {}),
    createdAt,
    read: false,
  }
}

export async function approveSubmission(
  submissionId: string,
  reviewedBy = "admin",
): Promise<ModerationSubmission | null> {
  const sql = getDb()
  const reviewedAt = Date.now()

  const rows = await sql<SubmissionRow[]>`
    UPDATE moderation_submissions
    SET    status = 'approved', reviewed_at = ${reviewedAt}, reviewed_by = ${reviewedBy}
    WHERE  id = ${submissionId}
    RETURNING *
  `
  if (rows.length === 0) return null

  const submission = rowToSubmission(rows[0])

  await appendCreatorNotification({
    huntId: submission.huntId,
    huntTitle: submission.hunt.title,
    action: "approved",
    creatorEmail: submission.creatorEmail,
  })

  return submission
}

export async function rejectSubmission(
  submissionId: string,
  reason: string,
  policyViolations: ContentPolicyViolation[] = [],
  reviewedBy = "admin",
): Promise<ModerationSubmission | null> {
  const sql = getDb()
  const reviewedAt = Date.now()

  // Fetch existing violations to merge.
  const existing = await sql<SubmissionRow[]>`
    SELECT policy_violations FROM moderation_submissions
    WHERE  id = ${submissionId}
    LIMIT  1
  `
  if (existing.length === 0) return null

  const merged = [
    ...new Set([...(existing[0].policy_violations ?? []), ...policyViolations]),
  ]

  const rows = await sql<SubmissionRow[]>`
    UPDATE moderation_submissions
    SET    status = 'rejected',
           reviewed_at = ${reviewedAt},
           reviewed_by = ${reviewedBy},
           rejection_reason = ${reason},
           policy_violations = ${merged}
    WHERE  id = ${submissionId}
    RETURNING *
  `
  if (rows.length === 0) return null

  const submission = rowToSubmission(rows[0])

  await appendCreatorNotification({
    huntId: submission.huntId,
    huntTitle: submission.hunt.title,
    action: "rejected",
    reason,
    creatorEmail: submission.creatorEmail,
  })

  return submission
}

export async function flagContentPolicyViolation(
  submissionId: string,
  violations: ContentPolicyViolation[],
): Promise<ModerationSubmission | null> {
  const sql = getDb()

  const existing = await sql<SubmissionRow[]>`
    SELECT policy_violations FROM moderation_submissions
    WHERE  id = ${submissionId}
    LIMIT  1
  `
  if (existing.length === 0) return null

  const merged = [
    ...new Set([...(existing[0].policy_violations ?? []), ...violations]),
  ]

  const rows = await sql<SubmissionRow[]>`
    UPDATE moderation_submissions
    SET    policy_violations = ${merged}
    WHERE  id = ${submissionId}
    RETURNING *
  `
  if (rows.length === 0) return null
  return rowToSubmission(rows[0])
}

export async function getCreatorNotifications(
  creatorEmail?: string,
): Promise<CreatorModerationNotification[]> {
  const sql = getDb()

  if (!creatorEmail) {
    const rows = await sql<NotificationRow[]>`
      SELECT * FROM moderation_notifications ORDER BY created_at DESC
    `
    return rows.map(rowToNotification)
  }

  const rows = await sql<NotificationRow[]>`
    SELECT * FROM moderation_notifications
    WHERE  creator_email IS NULL
       OR  LOWER(creator_email) = LOWER(${creatorEmail})
    ORDER  BY created_at DESC
  `
  return rows.map(rowToNotification)
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const sql = getDb()
  const result = await sql<{ id: string }[]>`
    UPDATE moderation_notifications
    SET    read = true
    WHERE  id = ${notificationId}
    RETURNING id
  `
  return result.length > 0
}

export async function getModerationStatusForHunts(
  huntIds: number[],
): Promise<Record<number, { status: ModerationDecision; rejectionReason?: string }>> {
  if (huntIds.length === 0) return {}

  const sql = getDb()
  const rows = await sql<SubmissionRow[]>`
    SELECT DISTINCT ON (hunt_id) *
    FROM   moderation_submissions
    WHERE  hunt_id = ANY(${huntIds})
    ORDER  BY hunt_id, submitted_at DESC
  `

  const result: Record<number, { status: ModerationDecision; rejectionReason?: string }> = {}
  for (const row of rows) {
    result[row.hunt_id] = {
      status: row.status as ModerationDecision,
      ...(row.rejection_reason !== null ? { rejectionReason: row.rejection_reason } : {}),
    }
  }
  return result
}
