import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { logger } from '@/lib/logger';

export type AnswerDisputeStatus =
  | 'pending'
  | 'reviewed'
  | 'approved'
  | 'accepted'
  | 'rejected'
  | 'overridden';

export type AnswerDisputeDecision =
  | 'pending'
  | 'reviewed'
  | 'approved'
  | 'accepted'
  | 'rejected'
  | 'override';

export interface AnswerDisputeAuditEntry {
  id: string;
  type: 'created' | 'reviewed' | 'override' | 'status_change';
  actor: string;
  note?: string;
  timestamp: number;
  previousStatus?: AnswerDisputeStatus;
  newStatus?: AnswerDisputeStatus;
}

export interface AnswerDispute {
  id: string;
  answerId: string;
  huntId: number;
  clueId: number;
  playerWallet: string;
  submittedAnswer: string;
  rejectedReason?: string;
  status: AnswerDisputeStatus;
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  resolutionNote?: string;
  overrideDecision?: 'accepted' | 'rejected';
  auditTrail: AnswerDisputeAuditEntry[];
}

interface CreateAnswerDisputeInput {
  answerId: string;
  huntId: number;
  clueId: number;
  playerWallet: string;
  submittedAnswer: string;
  rejectedReason?: string;
  status?: AnswerDisputeStatus;
}

interface ResolveAnswerDisputeInput {
  reviewer: string;
  decision: AnswerDisputeDecision;
  note?: string;
}

const DATA_DIR = path.join(process.cwd(), 'lib', 'answer-dispute-data');
const DISPUTES_FILE = path.join(DATA_DIR, 'disputes.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(filePath: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(filePath: string, data: T): void {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    logger.error('Failed to write answer dispute data file:', filePath, error);
  }
}

function getDisputes(): AnswerDispute[] {
  return readJSON<AnswerDispute[]>(DISPUTES_FILE, []);
}

function saveDisputes(disputes: AnswerDispute[]): void {
  writeJSON(DISPUTES_FILE, disputes);
}

function addAuditEntry(dispute: AnswerDispute, entry: AnswerDisputeAuditEntry): AnswerDispute {
  return {
    ...dispute,
    auditTrail: [...dispute.auditTrail, entry],
  };
}

export function getAnswerDisputesForAnswer(answerId: string): AnswerDispute[] {
  return getDisputes()
    .filter((dispute) => dispute.answerId === answerId)
    .sort((a, b) => b.submittedAt - a.submittedAt);
}

export function getAnswerDisputeById(disputeId: string): AnswerDispute | null {
  return getDisputes().find((dispute) => dispute.id === disputeId) ?? null;
}

export function getAnswerDisputeAuditLog(disputeId: string): AnswerDisputeAuditEntry[] {
  const dispute = getAnswerDisputeById(disputeId);
  return dispute?.auditTrail ?? [];
}

export function createAnswerDispute(input: CreateAnswerDisputeInput): AnswerDispute {
  const disputes = getDisputes();
  const existingPending = disputes.find(
    (dispute) =>
      dispute.answerId === input.answerId &&
      (dispute.status === 'pending' || dispute.status === 'reviewed')
  );
  if (existingPending) {
    return existingPending;
  }

  const timestamp = Date.now();
  const dispute: AnswerDispute = {
    id: randomUUID(),
    answerId: input.answerId,
    huntId: input.huntId,
    clueId: input.clueId,
    playerWallet: input.playerWallet,
    submittedAnswer: input.submittedAnswer,
    rejectedReason: input.rejectedReason,
    status: input.status ?? 'pending',
    submittedAt: timestamp,
    auditTrail: [
      {
        id: randomUUID(),
        type: 'created',
        actor: input.playerWallet,
        note: 'Player disputed a rejected answer.',
        timestamp,
        newStatus: input.status ?? 'pending',
      },
    ],
  };

  const next = [...disputes, dispute];
  saveDisputes(next);
  return dispute;
}

export function resolveAnswerDispute(
  disputeId: string,
  input: ResolveAnswerDisputeInput
): AnswerDispute | null {
  const disputes = getDisputes();
  const index = disputes.findIndex((dispute) => dispute.id === disputeId);
  if (index === -1) {
    return null;
  }

  const previous = disputes[index];
  const previousStatus = previous.status;
  let nextStatus: AnswerDisputeStatus = previousStatus;
  let overrideDecision: 'accepted' | 'rejected' | undefined = previous.overrideDecision;

  if (input.decision === 'override') {
    nextStatus = 'overridden';
    overrideDecision = 'accepted';
  } else if (input.decision === 'approved' || input.decision === 'accepted') {
    nextStatus = 'approved';
    overrideDecision = 'accepted';
  } else if (input.decision === 'rejected') {
    nextStatus = 'rejected';
    overrideDecision = 'rejected';
  } else if (input.decision === 'reviewed') {
    nextStatus = 'reviewed';
  }

  const updated: AnswerDispute = {
    ...previous,
    status: nextStatus,
    reviewedAt: Date.now(),
    reviewedBy: input.reviewer,
    resolutionNote: input.note,
    overrideDecision,
    auditTrail: [
      ...previous.auditTrail,
      {
        id: randomUUID(),
        type: input.decision === 'override' ? 'override' : 'reviewed',
        actor: input.reviewer,
        note: input.note,
        timestamp: Date.now(),
        previousStatus,
        newStatus: nextStatus,
      },
    ],
  };

  disputes[index] = updated;
  saveDisputes(disputes);
  return updated;
}

export const createDispute = createAnswerDispute;
export const reviewDispute = resolveAnswerDispute;
export const overrideAnswerDecision = resolveAnswerDispute;
export const getAuditLog = getAnswerDisputeAuditLog;

/** Test helper — reset persisted answer dispute data. */
export function __resetAnswerDisputeStoreForTests(): void {
  saveDisputes([]);
}
