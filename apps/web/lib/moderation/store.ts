import * as Sentry from '@sentry/nextjs';
import { randomUUID } from 'crypto';

import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { StoredHunt } from '@/lib/types';

import { scanHuntContent } from './autoFlag';
import type {
  ContentPolicyViolation,
  CreatorModerationNotification,
  ModerationDecision,
  ModerationSubmission,
} from './types';

// ── DB helper functions ──────────────────────────────────────────────────────

async function getQueue(): Promise<ModerationSubmission[]> {
  try {
    const sql = getDb();
    const rows = await sql<
      Array<{
        id: string;
        hunt_id: number;
        hunt_json: StoredHunt;
        status: ModerationDecision;
        submitted_at: Date;
        reviewed_at: Date | null;
        reviewed_by: string | null;
        rejection_reason: string | null;
        auto_flags: string[];
        policy_violations: string[];
        creator_email: string | null;
      }>
    >`
      SELECT id, hunt_id, hunt_json, status, submitted_at, reviewed_at,
             reviewed_by, rejection_reason, auto_flags, policy_violations,
             creator_email
      FROM moderation_queue
      ORDER BY submitted_at ASC
    `;

    return rows.map((row) => ({
      id: row.id,
      huntId: row.hunt_id,
      hunt: row.hunt_json,
      status: row.status,
      submittedAt: row.submitted_at.getTime(),
      reviewedAt: row.reviewed_at ? row.reviewed_at.getTime() : undefined,
      reviewedBy: row.reviewed_by ?? undefined,
      rejectionReason: row.rejection_reason ?? undefined,
      autoFlags: row.auto_flags as AutoFlagReason[],
      policyViolations: row.policy_violations as ContentPolicyViolation[],
      creatorEmail: row.creator_email ?? undefined,
    }));
  } catch (err) {
    logger.error('Failed to read moderation queue from DB:', err);
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      tags: { source: 'moderationStore', operation: 'getQueue' },
    });
    return [];
  }
}

async function getNotifications(): Promise<CreatorModerationNotification[]> {
  try {
    const sql = getDb();
    const rows = await sql<
      Array<{
        id: string;
        hunt_id: number;
        hunt_title: string;
        action: 'approved' | 'rejected';
        reason: string | null;
        creator_email: string | null;
        created_at: Date;
        read: boolean;
      }>
    >`
      SELECT id, hunt_id, hunt_title, action, reason, creator_email,
             created_at, read
      FROM moderation_notifications
      ORDER BY created_at DESC
    `;

    return rows.map((row) => ({
      id: row.id,
      huntId: row.hunt_id,
      huntTitle: row.hunt_title,
      action: row.action,
      reason: row.reason ?? undefined,
      creatorEmail: row.creator_email ?? undefined,
      createdAt: row.created_at.getTime(),
      read: row.read,
    }));
  } catch (err) {
    logger.error('Failed to read moderation notifications from DB:', err);
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      tags: { source: 'moderationStore', operation: 'getNotifications' },
    });
    return [];
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function getPendingSubmissions(): Promise<ModerationSubmission[]> {
  return getQueue().then((queue) =>
    queue.filter((s) => s.status === 'pending').sort((a, b) => a.submittedAt - b.submittedAt)
  );
}

export function getAllSubmissions(): Promise<ModerationSubmission[]> {
  return getQueue().then((queue) => queue.sort((a, b) => b.submittedAt - a.submittedAt));
}

export async function getSubmissionByHuntId(
  huntId: number
): Promise<ModerationSubmission | undefined> {
  try {
    const sql = getDb();
    const rows = await sql<
      Array<{
        id: string;
        hunt_id: number;
        hunt_json: StoredHunt;
        status: ModerationDecision;
        submitted_at: Date;
        reviewed_at: Date | null;
        reviewed_by: string | null;
        rejection_reason: string | null;
        auto_flags: string[];
        policy_violations: string[];
        creator_email: string | null;
      }>
    >`
      SELECT id, hunt_id, hunt_json, status, submitted_at, reviewed_at,
             reviewed_by, rejection_reason, auto_flags, policy_violations,
             creator_email
      FROM moderation_queue
      WHERE hunt_id = ${huntId}
      ORDER BY submitted_at DESC
      LIMIT 1
    `;

    if (rows.length === 0) return undefined;
    const row = rows[0];
    return {
      id: row.id,
      huntId: row.hunt_id,
      hunt: row.hunt_json,
      status: row.status,
      submittedAt: row.submitted_at.getTime(),
      reviewedAt: row.reviewed_at ? row.reviewed_at.getTime() : undefined,
      reviewedBy: row.reviewed_by ?? undefined,
      rejectionReason: row.rejection_reason ?? undefined,
      autoFlags: row.auto_flags as AutoFlagReason[],
      policyViolations: row.policy_violations as ContentPolicyViolation[],
      creatorEmail: row.creator_email ?? undefined,
    };
  } catch (err) {
    logger.error('Failed to getSubmissionByHuntId from DB:', err);
    return undefined;
  }
}

export async function submitHuntForModeration(hunt: StoredHunt): Promise<ModerationSubmission> {
  const existing = await getSubmissionByHuntId(hunt.id);
  if (existing && existing.status === 'pending') {
    return existing;
  }

  const { autoFlags, policyViolations } = scanHuntContent(hunt);
  const submission: ModerationSubmission = {
    id: randomUUID(),
    huntId: hunt.id,
    hunt,
    status: 'pending',
    submittedAt: Date.now(),
    autoFlags,
    policyViolations,
    creatorEmail: hunt.creatorEmail,
  };

  try {
    const sql = getDb();
    await sql`
      INSERT INTO moderation_queue (
        id, hunt_id, hunt_json, status, submitted_at,
        auto_flags, policy_violations, creator_email
      )
      VALUES (
        ${submission.id},
        ${submission.huntId},
        ${sql.json(submission.hunt)},
        ${submission.status},
        NOW(),
        ${sql.array(submission.autoFlags)},
        ${sql.array(submission.policyViolations)},
        ${submission.creatorEmail}
      )
    `;
  } catch (err) {
    logger.error('Failed to insert moderation submission:', err);
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      tags: { source: 'moderationStore', operation: 'submitHuntForModeration' },
    });
  }

  return submission;
}

async function appendCreatorNotification(input: {
  huntId: number;
  huntTitle: string;
  action: 'approved' | 'rejected';
  reason?: string;
  creatorEmail?: string;
}): Promise<CreatorModerationNotification> {
  const notification: CreatorModerationNotification = {
    id: randomUUID(),
    huntId: input.huntId,
    huntTitle: input.huntTitle,
    action: input.action,
    reason: input.reason,
    creatorEmail: input.creatorEmail,
    createdAt: Date.now(),
    read: false,
  };

  try {
    const sql = getDb();
    await sql`
      INSERT INTO moderation_notifications (
        id, hunt_id, hunt_title, action, reason, creator_email, created_at, read
      )
      VALUES (
        ${notification.id},
        ${notification.huntId},
        ${notification.huntTitle},
        ${notification.action},
        ${notification.reason},
        ${notification.creatorEmail},
        NOW(),
        ${notification.read}
      )
    `;
  } catch (err) {
    logger.error('Failed to insert moderation notification:', err);
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      tags: { source: 'moderationStore', operation: 'appendCreatorNotification' },
    });
  }

  return notification;
}

export async function approveSubmission(
  submissionId: string,
  reviewedBy = 'admin'
): Promise<ModerationSubmission | null> {
  try {
    const sql = getDb();
    const rows = await sql<
      Array<{
        id: string;
        hunt_id: number;
        hunt_json: StoredHunt;
        status: ModerationDecision;
        submitted_at: Date;
        reviewed_at: Date | null;
        reviewed_by: string | null;
        rejection_reason: string | null;
        auto_flags: string[];
        policy_violations: string[];
        creator_email: string | null;
      }>
    >`
      UPDATE moderation_queue
      SET status = 'approved',
          reviewed_at = NOW(),
          reviewed_by = ${reviewedBy}
      WHERE id = ${submissionId}
      RETURNING id, hunt_id, hunt_json, status, submitted_at, reviewed_at,
                reviewed_by, rejection_reason, auto_flags, policy_violations,
                creator_email
    `;

    if (rows.length === 0) return null;
    const row = rows[0];
    const result: ModerationSubmission = {
      id: row.id,
      huntId: row.hunt_id,
      hunt: row.hunt_json,
      status: row.status,
      submittedAt: row.submitted_at.getTime(),
      reviewedAt: row.reviewed_at ? row.reviewed_at.getTime() : undefined,
      reviewedBy: row.reviewed_by ?? undefined,
      rejectionReason: row.rejection_reason ?? undefined,
      autoFlags: row.auto_flags as AutoFlagReason[],
      policyViolations: row.policy_violations as ContentPolicyViolation[],
      creatorEmail: row.creator_email ?? undefined,
    };

    await appendCreatorNotification({
      huntId: result.huntId,
      huntTitle: result.hunt.title,
      action: 'approved',
      creatorEmail: result.creatorEmail,
    });

    return result;
  } catch (err) {
    logger.error('Failed to approveSubmission:', err);
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      tags: { source: 'moderationStore', operation: 'approveSubmission' },
    });
    return null;
  }
}

export async function rejectSubmission(
  submissionId: string,
  reason: string,
  policyViolations: ContentPolicyViolation[] = [],
  reviewedBy = 'admin'
): Promise<ModerationSubmission | null> {
  try {
    const sql = getDb();
    const rows = await sql<
      Array<{
        id: string;
        hunt_id: number;
        hunt_json: StoredHunt;
        status: ModerationDecision;
        submitted_at: Date;
        reviewed_at: Date | null;
        reviewed_by: string | null;
        rejection_reason: string | null;
        auto_flags: string[];
        policy_violations: string[];
        creator_email: string | null;
      }>
    >`
      UPDATE moderation_queue
      SET status = 'rejected',
          reviewed_at = NOW(),
          reviewed_by = ${reviewedBy},
          rejection_reason = ${reason},
          policy_violations = ARRAY(
            SELECT DISTINCT unnest(policy_violations || ${sql.array(policyViolations)})
          )
      WHERE id = ${submissionId}
      RETURNING id, hunt_id, hunt_json, status, submitted_at, reviewed_at,
                reviewed_by, rejection_reason, auto_flags, policy_violations,
                creator_email
    `;

    if (rows.length === 0) return null;
    const row = rows[0];
    const result: ModerationSubmission = {
      id: row.id,
      huntId: row.hunt_id,
      hunt: row.hunt_json,
      status: row.status,
      submittedAt: row.submitted_at.getTime(),
      reviewedAt: row.reviewed_at ? row.reviewed_at.getTime() : undefined,
      reviewedBy: row.reviewed_by ?? undefined,
      rejectionReason: row.rejection_reason ?? undefined,
      autoFlags: row.auto_flags as AutoFlagReason[],
      policyViolations: row.policy_violations as ContentPolicyViolation[],
      creatorEmail: row.creator_email ?? undefined,
    };

    await appendCreatorNotification({
      huntId: result.huntId,
      huntTitle: result.hunt.title,
      action: 'rejected',
      reason,
      creatorEmail: result.creatorEmail,
    });

    return result;
  } catch (err) {
    logger.error('Failed to rejectSubmission:', err);
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      tags: { source: 'moderationStore', operation: 'rejectSubmission' },
    });
    return null;
  }
}

export async function flagContentPolicyViolation(
  submissionId: string,
  violations: ContentPolicyViolation[]
): Promise<ModerationSubmission | null> {
  try {
    const sql = getDb();
    const rows = await sql<
      Array<{
        id: string;
        hunt_id: number;
        hunt_json: StoredHunt;
        status: ModerationDecision;
        submitted_at: Date;
        reviewed_at: Date | null;
        reviewed_by: string | null;
        rejection_reason: string | null;
        auto_flags: string[];
        policy_violations: string[];
        creator_email: string | null;
      }>
    >`
      UPDATE moderation_queue
      SET policy_violations = ARRAY(
            SELECT DISTINCT unnest(policy_violations || ${sql.array(violations)})
          )
      WHERE id = ${submissionId}
      RETURNING id, hunt_id, hunt_json, status, submitted_at, reviewed_at,
                reviewed_by, rejection_reason, auto_flags, policy_violations,
                creator_email
    `;

    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      huntId: row.hunt_id,
      hunt: row.hunt_json,
      status: row.status,
      submittedAt: row.submitted_at.getTime(),
      reviewedAt: row.reviewed_at ? row.reviewed_at.getTime() : undefined,
      reviewedBy: row.reviewed_by ?? undefined,
      rejectionReason: row.rejection_reason ?? undefined,
      autoFlags: row.auto_flags as AutoFlagReason[],
      policyViolations: row.policy_violations as ContentPolicyViolation[],
      creatorEmail: row.creator_email ?? undefined,
    };
  } catch (err) {
    logger.error('Failed to flagContentPolicyViolation:', err);
    return null;
  }
}

export function getCreatorNotifications(
  creatorEmail?: string
): Promise<CreatorModerationNotification[]> {
  return getNotifications().then((all) => {
    if (!creatorEmail) return all;
    return all.filter(
      (n) => !n.creatorEmail || n.creatorEmail.toLowerCase() === creatorEmail.toLowerCase()
    );
  });
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  try {
    const sql = getDb();
    const rows = await sql`
      UPDATE moderation_notifications
      SET read = TRUE
      WHERE id = ${notificationId}
      RETURNING id
    `;
    return rows.length > 0;
  } catch (err) {
    logger.error('Failed to markNotificationRead:', err);
    return false;
  }
}

export async function getModerationStatusForHunts(
  huntIds: number[]
): Promise<Record<number, { status: ModerationDecision; rejectionReason?: string }>> {
  if (huntIds.length === 0) return {};

  try {
    const sql = getDb();
    const rows = await sql<
      Array<{
        hunt_id: number;
        status: ModerationDecision;
        rejection_reason: string | null;
        submitted_at: Date;
      }>
    >`
      SELECT DISTINCT ON (hunt_id)
        hunt_id, status, rejection_reason, submitted_at
      FROM moderation_queue
      WHERE hunt_id = ANY(${sql.array(huntIds)})
      ORDER BY hunt_id, submitted_at DESC
    `;

    const result: Record<number, { status: ModerationDecision; rejectionReason?: string }> = {};
    for (const row of rows) {
      result[row.hunt_id] = {
        status: row.status,
        rejectionReason: row.rejection_reason ?? undefined,
      };
    }
    return result;
  } catch (err) {
    logger.error('Failed to getModerationStatusForHunts:', err);
    return {};
  }
}

/** Test helper — reset persisted moderation data. */
export async function __resetModerationStoreForTests(): Promise<void> {
  try {
    const sql = getDb();
    await sql`DELETE FROM moderation_queue`;
    await sql`DELETE FROM moderation_notifications`;
  } catch (err) {
    logger.error('Failed to reset moderation store for tests:', err);
  }
}
