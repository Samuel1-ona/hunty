import * as fs from "fs"
import * as path from "path"
import { randomUUID } from "crypto"
import * as Sentry from "@sentry/nextjs"
import { logger } from "@/lib/logger"
import type {
  ContentPolicyViolation,
  CreatorModerationNotification,
  ModerationDecision,
  ModerationSubmission,
} from "./types"
import type { StoredHunt } from "@/lib/types"
import { scanHuntContent } from "./autoFlag"

const DATA_DIR = path.join(process.cwd(), "lib", "moderation-data")
const QUEUE_FILE = path.join(DATA_DIR, "queue.json")
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json")

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function readJSON<T>(filePath: string, fallback: T): T {
  try {
    const data = fs.readFileSync(filePath, "utf-8")
    return JSON.parse(data) as T
  } catch {
    return fallback
  }
}

function writeJSON<T>(filePath: string, data: T): void {
  try {
    ensureDataDir()
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8")
  } catch (err) {
    logger.error("Failed to write moderation data file:", filePath, err)
    // Previously swallowed — now forwarded to Sentry so filesystem failures
    // surface in production dashboards.
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      tags: { source: "moderationStore", operation: "writeJSON" },
      extra: { filePath },
    })
  }
}

function getQueue(): ModerationSubmission[] {
  return readJSON<ModerationSubmission[]>(QUEUE_FILE, [])
}

function saveQueue(queue: ModerationSubmission[]): void {
  writeJSON(QUEUE_FILE, queue)
}

function getNotifications(): CreatorModerationNotification[] {
  return readJSON<CreatorModerationNotification[]>(NOTIFICATIONS_FILE, [])
}

function saveNotifications(notifications: CreatorModerationNotification[]): void {
  writeJSON(NOTIFICATIONS_FILE, notifications)
}

export function getPendingSubmissions(): ModerationSubmission[] {
  return getQueue()
    .filter((s) => s.status === "pending")
    .sort((a, b) => a.submittedAt - b.submittedAt)
}

export function getAllSubmissions(): ModerationSubmission[] {
  return getQueue().sort((a, b) => b.submittedAt - a.submittedAt)
}

export function getSubmissionByHuntId(huntId: number): ModerationSubmission | undefined {
  return getQueue().find((s) => s.huntId === huntId)
}

export function submitHuntForModeration(hunt: StoredHunt): ModerationSubmission {
  const queue = getQueue()
  const existing = queue.find((s) => s.huntId === hunt.id && s.status === "pending")
  if (existing) {
    return existing
  }

  const { autoFlags, policyViolations } = scanHuntContent(hunt)
  const submission: ModerationSubmission = {
    id: randomUUID(),
    huntId: hunt.id,
    hunt,
    status: "pending",
    submittedAt: Date.now(),
    autoFlags,
    policyViolations,
    creatorEmail: hunt.creatorEmail,
  }

  saveQueue([...queue, submission])
  return submission
}

function appendCreatorNotification(input: {
  huntId: number
  huntTitle: string
  action: "approved" | "rejected"
  reason?: string
  creatorEmail?: string
}): CreatorModerationNotification {
  const notification: CreatorModerationNotification = {
    id: randomUUID(),
    huntId: input.huntId,
    huntTitle: input.huntTitle,
    action: input.action,
    reason: input.reason,
    creatorEmail: input.creatorEmail,
    createdAt: Date.now(),
    read: false,
  }
  saveNotifications([notification, ...getNotifications()])
  return notification
}

function updateSubmission(
  submissionId: string,
  updater: (submission: ModerationSubmission) => ModerationSubmission
): ModerationSubmission | null {
  const queue = getQueue()
  const index = queue.findIndex((s) => s.id === submissionId)
  if (index === -1) return null
  const updated = updater(queue[index])
  const next = [...queue]
  next[index] = updated
  saveQueue(next)
  return updated
}

export function approveSubmission(
  submissionId: string,
  reviewedBy = "admin"
): ModerationSubmission | null {
  const result = updateSubmission(submissionId, (s) => ({
    ...s,
    status: "approved" as ModerationDecision,
    reviewedAt: Date.now(),
    reviewedBy,
  }))
  if (result) {
    appendCreatorNotification({
      huntId: result.huntId,
      huntTitle: result.hunt.title,
      action: "approved",
      creatorEmail: result.creatorEmail,
    })
  }
  return result
}

export function rejectSubmission(
  submissionId: string,
  reason: string,
  policyViolations: ContentPolicyViolation[] = [],
  reviewedBy = "admin"
): ModerationSubmission | null {
  const result = updateSubmission(submissionId, (s) => ({
    ...s,
    status: "rejected" as ModerationDecision,
    reviewedAt: Date.now(),
    reviewedBy,
    rejectionReason: reason,
    policyViolations: [...new Set([...s.policyViolations, ...policyViolations])],
  }))
  if (result) {
    appendCreatorNotification({
      huntId: result.huntId,
      huntTitle: result.hunt.title,
      action: "rejected",
      reason,
      creatorEmail: result.creatorEmail,
    })
  }
  return result
}

export function flagContentPolicyViolation(
  submissionId: string,
  violations: ContentPolicyViolation[]
): ModerationSubmission | null {
  return updateSubmission(submissionId, (s) => ({
    ...s,
    policyViolations: [...new Set([...s.policyViolations, ...violations])],
  }))
}

export function getCreatorNotifications(creatorEmail?: string): CreatorModerationNotification[] {
  const all = getNotifications()
  if (!creatorEmail) return all
  return all.filter(
    (n) => !n.creatorEmail || n.creatorEmail.toLowerCase() === creatorEmail.toLowerCase()
  )
}

export function markNotificationRead(notificationId: string): boolean {
  const list = getNotifications()
  const index = list.findIndex((n) => n.id === notificationId)
  if (index === -1) return false
  const next = [...list]
  next[index] = { ...next[index], read: true }
  saveNotifications(next)
  return true
}

export function getModerationStatusForHunts(huntIds: number[]): Record<
  number,
  { status: ModerationDecision; rejectionReason?: string }
> {
  const queue = getQueue()
  const result: Record<number, { status: ModerationDecision; rejectionReason?: string }> = {}
  for (const huntId of huntIds) {
    const latest = queue
      .filter((s) => s.huntId === huntId)
      .sort((a, b) => b.submittedAt - a.submittedAt)[0]
    if (latest) {
      result[huntId] = {
        status: latest.status,
        rejectionReason: latest.rejectionReason,
      }
    }
  }
  return result
}

/** Test helper — reset persisted moderation data. */
export function __resetModerationStoreForTests(): void {
  saveQueue([])
  saveNotifications([])
}
