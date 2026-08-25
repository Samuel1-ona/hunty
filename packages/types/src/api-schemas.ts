/**
 * API request/response Zod schemas shared between the web app and any client
 * that imports from @hunty/types.
 *
 * These schemas are the single source of truth for what every API route
 * accepts. Route handlers import and re-use them so validation logic is
 * never duplicated between server and client.
 */

import { z } from "zod"

// ─── Primitives ──────────────────────────────────────────────────────────────

/** Positive integer path/body param (hunt IDs, season IDs, …) */
export const positiveIntSchema = z.number().int().positive()

/** Non-empty trimmed string */
export const nonEmptyStringSchema = z.string().min(1).trim()

/** Stellar G-address: starts with "G", exactly 56 characters */
export const stellarAddressSchema = z
  .string()
  .regex(/^G[A-Z2-7]{55}$/, "Must be a valid Stellar G-address (56 chars)")

// ─── Admin / Moderation ──────────────────────────────────────────────────────

export const contentPolicyViolationSchema = z.enum([
  "hate_speech",
  "harassment",
  "spam",
  "nudity",
  "violence",
  "misinformation",
  "other",
])

export const adminModerationBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    submissionId: nonEmptyStringSchema,
    reviewedBy: z.string().optional(),
  }),
  z.object({
    action: z.literal("reject"),
    submissionId: nonEmptyStringSchema,
    reason: nonEmptyStringSchema,
    policyViolations: z.array(contentPolicyViolationSchema).optional(),
    reviewedBy: z.string().optional(),
  }),
  z.object({
    action: z.literal("flag"),
    submissionId: nonEmptyStringSchema,
    policyViolations: z.array(contentPolicyViolationSchema).min(1),
    reviewedBy: z.string().optional(),
  }),
])

export const adminModerationQuerySchema = z.object({
  view: z.enum(["pending", "all"]).optional().default("pending"),
})

// ─── Admin / Anti-cheat ──────────────────────────────────────────────────────

export const antiCheatQuerySchema = z.object({
  type: z.enum(["flagged", "anomalies", "submissions", "bans", "config"]).optional().default("flagged"),
  wallet: z.string().optional(),
})

export const antiCheatBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("ban"),
    wallet: nonEmptyStringSchema,
    ip: z.string().optional(),
    reason: z.string().optional(),
    bannedBy: z.string().optional(),
  }),
  z.object({
    action: z.literal("unban"),
    wallet: nonEmptyStringSchema,
  }),
  z.object({
    action: z.literal("updateConfig"),
    config: z.record(z.string(), z.unknown()),
  }),
])

// ─── Admin / Featured ────────────────────────────────────────────────────────

export const adminFeaturedBodySchema = z.object({
  huntId: z.number().int().nullable(),
})

// ─── Analytics / Hint usage ──────────────────────────────────────────────────

export const hintUsageBodySchema = z.object({
  huntId: positiveIntSchema,
  clueId: positiveIntSchema,
  hintIndex: z.number().int().min(0).max(2),
  wallet: nonEmptyStringSchema,
})

export const hintUsageQuerySchema = z.object({
  huntId: z
    .string()
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
      message: "huntId must be a positive integer",
    })
    .transform(Number),
})

// ─── Analytics / Hunt view ───────────────────────────────────────────────────

export const huntViewBodySchema = z.object({
  huntId: z
    .union([z.number(), z.string().transform(Number)])
    .refine((v) => Number.isFinite(v) && v > 0, { message: "huntId must be a positive number" }),
})

// ─── Analytics / Performance ─────────────────────────────────────────────────

export const performanceMetricBodySchema = z.object({
  name: nonEmptyStringSchema,
  value: z.number(),
  rating: z.string().optional(),
  timestamp: z.number().optional(),
  url: z.string().optional(),
})

// ─── Push / Send ─────────────────────────────────────────────────────────────

export const pushEventTypeSchema = z.enum([
  "hunt_start",
  "hunt_cancelled",
  "leaderboard_overtake",
  "player_registered",
  "first_completion",
])

export const pushSendBodySchema = z.object({
  type: pushEventTypeSchema,
  walletAddresses: z
    .array(nonEmptyStringSchema)
    .min(1, { message: "walletAddresses must be a non-empty array" }),
  context: z.record(z.string(), z.union([z.string(), z.number()])).optional().default({}),
})

// ─── Push tokens ─────────────────────────────────────────────────────────────

export const pushTokenRegisterBodySchema = z.object({
  token: nonEmptyStringSchema,
  walletAddress: nonEmptyStringSchema,
})

export const pushTokenDeleteBodySchema = z.object({
  token: nonEmptyStringSchema.optional(),
  walletAddress: nonEmptyStringSchema.optional(),
}).refine((b) => b.token !== undefined || b.walletAddress !== undefined, {
  message: "token or walletAddress is required",
})

// ─── Moderation / Submit ─────────────────────────────────────────────────────

export const moderationSubmitBodySchema = z.object({
  hunt: z.object({
    id: positiveIntSchema,
    title: nonEmptyStringSchema,
  }).passthrough(),
})

// ─── Moderation / Sync ───────────────────────────────────────────────────────

export const moderationSyncBodySchema = z.object({
  notificationId: nonEmptyStringSchema,
})

export const moderationSyncQuerySchema = z.object({
  email: z.string().email().optional(),
  huntIds: z.string().optional(),
})

// ─── Notifications / Complete ────────────────────────────────────────────────

export const notificationsCompleteBodySchema = z.object({
  huntName: nonEmptyStringSchema,
  creatorEmail: z.string().email("creatorEmail must be a valid email address"),
  completionTime: nonEmptyStringSchema,
})

// ─── Hunts / Schedule ────────────────────────────────────────────────────────
// POST /api/hunts/schedule has no body — it's a cron-style trigger.
// We provide an empty schema for completeness.
export const huntScheduleBodySchema = z.object({}).optional()

// ─── v1 / Tags ───────────────────────────────────────────────────────────────

export const tagsQuerySchema = z.object({
  q: z.string().optional().default(""),
  title: z.string().optional(),
  description: z.string().optional(),
})

export const tagsBodySchema = z.object({
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

// ─── v1 / Hunts / Bulk ───────────────────────────────────────────────────────

export const huntsBulkBodySchema = z.object({
  action: z.enum(["archive", "unarchive", "soft-delete", "restore", "permanent-delete"]),
  huntIds: z
    .array(z.union([z.string(), z.number()]))
    .min(1, { message: "huntIds must be a non-empty array" }),
  confirmed: z.boolean().optional(),
})

// ─── v1 / Hunts / [id] / Archive ─────────────────────────────────────────────

export const huntArchiveBodySchema = z.object({
  action: z.enum(["archive", "unarchive"]),
})

// ─── v1 / Hunts / [id] / Delete ──────────────────────────────────────────────

export const huntDeleteBodySchema = z.object({
  action: z.enum(["soft-delete", "restore", "permanent-delete"]),
  confirmed: z.boolean().optional(),
})

// ─── v1 / Hunts / Versions ──────────────────────────────────────────────────

export const huntSnapshotSchema = z.object({
  id: positiveIntSchema,
}).passthrough()

export const huntVersionEditBodySchema = z.object({
  actorAddress: nonEmptyStringSchema,
  snapshot: huntSnapshotSchema,
})

export const huntVersionRestoreBodySchema = z.object({
  actorAddress: nonEmptyStringSchema,
})

export const huntVersionsQuerySchema = z.object({
  actorAddress: nonEmptyStringSchema,
})

// ─── v1 / Hunts / [id] / Collaborators ───────────────────────────────────────

export const collaboratorRoleSchema = z.enum(["editor", "viewer"])

export const collaboratorsBodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ensure_owner"), actorAddress: nonEmptyStringSchema }),
  z.object({
    action: z.literal("invite"),
    actorAddress: nonEmptyStringSchema,
    walletAddress: nonEmptyStringSchema,
    role: collaboratorRoleSchema.optional(),
  }),
  z.object({ action: z.literal("accept"), actorAddress: nonEmptyStringSchema }),
  z.object({
    action: z.literal("update_role"),
    actorAddress: nonEmptyStringSchema,
    walletAddress: nonEmptyStringSchema,
    role: collaboratorRoleSchema,
  }),
  z.object({
    action: z.literal("remove"),
    actorAddress: nonEmptyStringSchema,
    walletAddress: nonEmptyStringSchema,
  }),
  z.object({
    action: z.literal("transfer"),
    actorAddress: nonEmptyStringSchema,
    newOwnerAddress: nonEmptyStringSchema,
  }),
])

// ─── v1 / Hunts / [id] / Progress ────────────────────────────────────────────

export const huntProgressBodySchema = z.object({
  wallet: nonEmptyStringSchema,
  currentClueIndex: z.number().int().min(0),
  totalClues: z.number().int().min(0),
  totalPoints: z.number().int().min(0).optional().default(0),
  completedClueIds: z.array(z.number().int()).optional().default([]),
  completed: z.boolean().optional().default(false),
})

export const huntProgressQuerySchema = z.object({
  wallet: nonEmptyStringSchema,
})

// ─── v1 / Hunts / [id] / Complete ────────────────────────────────────────────

export const huntCompleteBodySchema = z.object({
  playerAddress: nonEmptyStringSchema,
})

// ─── v1 / Hunts / [id] / Reviews ─────────────────────────────────────────────

export const huntReviewBodySchema = z.object({
  playerAddress: nonEmptyStringSchema,
  rating: z
    .union([z.number(), z.string().transform(Number)])
    .refine((v) => Number.isInteger(v) && v >= 1 && v <= 5, {
      message: "rating must be an integer between 1 and 5",
    }),
  text: z.string().optional(),
  difficultyRating: z.string().optional(),
})

// ─── v1 / Hunts / [id] / Reviews / [reviewId] / Moderate ────────────────────

export const reviewModerateBodySchema = z.object({
  action: z.enum(["delete", "flag", "unflag"]),
  moderatorAddress: nonEmptyStringSchema,
})

// ─── v1 / Seasons ────────────────────────────────────────────────────────────

export const seasonCreateBodySchema = z.object({
  name: nonEmptyStringSchema,
  startTime: z.string().datetime({ message: "startTime must be a valid ISO 8601 datetime" }),
  endTime: z.string().datetime({ message: "endTime must be a valid ISO 8601 datetime" }),
  rewards: z.array(z.unknown()).optional(),
})

export const seasonArchiveBodySchema = z.object({
  finalLeaderboard: z.array(z.unknown()).min(0),
})

// ─── v1 / Seasons / [id] ─────────────────────────────────────────────────────

export const seasonStatusSchema = z.enum(["Upcoming", "Active", "Ended"])

export const seasonPatchBodySchema = z.object({
  status: seasonStatusSchema.optional(),
})

// ─── v1 / Seasons / Badges ───────────────────────────────────────────────────

export const seasonBadgeBodySchema = z.object({
  seasonId: positiveIntSchema,
  address: nonEmptyStringSchema,
  name: z.string().optional(),
  rank: z.number().int().min(1).optional(),
})

// ─── v1 / Drafts ─────────────────────────────────────────────────────────────

export const draftUpsertBodySchema = z.object({
  ownerKey: nonEmptyStringSchema,
  draftId: nonEmptyStringSchema,
  label: z.string().optional(),
  savedAt: z.string().optional(),
  hunts: z.array(z.unknown()).min(0, { message: "hunts must be an array" }),
  rewards: z.array(z.unknown()).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  recovered: z.boolean().optional(),
})

export const draftListQuerySchema = z.object({
  ownerKey: nonEmptyStringSchema,
})

export const draftPatchBodySchema = z.object({
  recovered: z.boolean().optional(),
})

// ─── Paymaster / Sponsor ─────────────────────────────────────────────────────

export const paymasterSponsorBodySchema = z.object({
  txXdr: nonEmptyStringSchema,
  walletAddress: stellarAddressSchema,
})

// ─── Paymaster / Admin config ────────────────────────────────────────────────

export const paymasterAdminConfigBodySchema = z.object({
  maxSponsoredTx: z.number().int().min(0).nullable().optional(),
  maxBudgetPerUserStroops: z.number().int().min(0).nullable().optional(),
  maxFeePerTxStroops: z.number().int().min(0).nullable().optional(),
})

// ─── Re-export convenience map ───────────────────────────────────────────────

export const apiSchemas = {
  adminModerationBody: adminModerationBodySchema,
  adminModerationQuery: adminModerationQuerySchema,
  antiCheatQuery: antiCheatQuerySchema,
  antiCheatBody: antiCheatBodySchema,
  adminFeaturedBody: adminFeaturedBodySchema,
  hintUsageBody: hintUsageBodySchema,
  hintUsageQuery: hintUsageQuerySchema,
  huntViewBody: huntViewBodySchema,
  performanceMetricBody: performanceMetricBodySchema,
  pushSendBody: pushSendBodySchema,
  pushTokenRegister: pushTokenRegisterBodySchema,
  pushTokenDelete: pushTokenDeleteBodySchema,
  moderationSubmitBody: moderationSubmitBodySchema,
  moderationSyncBody: moderationSyncBodySchema,
  moderationSyncQuery: moderationSyncQuerySchema,
  notificationsCompleteBody: notificationsCompleteBodySchema,
  tagsQuery: tagsQuerySchema,
  tagsBody: tagsBodySchema,
  huntsBulkBody: huntsBulkBodySchema,
  huntArchiveBody: huntArchiveBodySchema,
  huntDeleteBody: huntDeleteBodySchema,
  collaboratorsBody: collaboratorsBodySchema,
  huntProgressBody: huntProgressBodySchema,
  huntProgressQuery: huntProgressQuerySchema,
  huntCompleteBody: huntCompleteBodySchema,
  huntReviewBody: huntReviewBodySchema,
  reviewModerateBody: reviewModerateBodySchema,
  seasonCreateBody: seasonCreateBodySchema,
  seasonArchiveBody: seasonArchiveBodySchema,
  seasonPatchBody: seasonPatchBodySchema,
  seasonBadgeBody: seasonBadgeBodySchema,
  draftUpsertBody: draftUpsertBodySchema,
  draftListQuery: draftListQuerySchema,
  draftPatchBody: draftPatchBodySchema,
  paymasterSponsorBody: paymasterSponsorBodySchema,
  paymasterAdminConfigBody: paymasterAdminConfigBodySchema,
} as const
