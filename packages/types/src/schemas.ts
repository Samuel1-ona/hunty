/**
 * Zod schemas for runtime validation of the shared domain types.
 *
 * Imported from `@hunty/types/schemas` so that consumers who only need the
 * static types (e.g. the mobile app) don't pull Zod into their bundle. Each
 * schema is designed to stay structurally in sync with its interface in the
 * sibling modules.
 */

import { z } from "zod"

export const rewardTypeSchema = z.enum(["XLM", "NFT", "Both"])

export const huntStatusSchema = z.enum([
  "Active",
  "Completed",
  "Draft",
  "Cancelled",
  "PendingReview",
  "Scheduled",
  "Ended",
])

export const clueDifficultySchema = z.enum(["Easy", "Medium", "Hard"])

export const clueTypeSchema = z.enum([
  "text",
  "image",
  "location",
  "qr",
  "multiple-choice",
])

export const imageClueModeSchema = z.enum([
  "identify-object",
  "spot-difference",
])

export const clueChoiceOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

export const multipleChoiceConfigSchema = z.object({
  options: z.array(clueChoiceOptionSchema).min(2),
  correctOptionId: z.string().min(1),
})

export const rewardSchema = z.object({
  place: z.number(),
  amount: z.number(),
})

export const clueSchema = z
  .object({
    id: z.number(),
    huntId: z.number(),
    question: z.string(),
    answer: z.string(),
    points: z.number(),
    type: clueTypeSchema.optional(),
    imageCid: z.string().optional(),
    imageMode: imageClueModeSchema.optional(),
    qrPayload: z.string().optional(),
    multipleChoice: multipleChoiceConfigSchema.optional(),
    hint: z.string().optional(),
    hintCost: z.number().optional(),
    difficulty: clueDifficultySchema.optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    geofenceRadiusMeters: z.number().optional(),
  })
  .superRefine((clue, ctx) => {
    const type = clue.type ?? "text";

    if (type === "image" && !clue.imageCid?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Image clues require an image reference.",
        path: ["imageCid"],
      });
    }

    if (type === "location") {
      if (
        clue.latitude == null ||
        !Number.isFinite(clue.latitude) ||
        clue.latitude < -90 ||
        clue.latitude > 90
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Location clues require a latitude between -90 and 90.",
          path: ["latitude"],
        });
      }

      if (
        clue.longitude == null ||
        !Number.isFinite(clue.longitude) ||
        clue.longitude < -180 ||
        clue.longitude > 180
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Location clues require a longitude between -180 and 180.",
          path: ["longitude"],
        });
      }

      if (
        clue.geofenceRadiusMeters != null &&
        (!Number.isFinite(clue.geofenceRadiusMeters) ||
          clue.geofenceRadiusMeters <= 0)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "The geofence radius must be greater than zero.",
          path: ["geofenceRadiusMeters"],
        });
      }
    }

    if (type === "qr" && !clue.qrPayload?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "QR clues require an expected payload.",
        path: ["qrPayload"],
      });
    }

    if (type === "multiple-choice") {
      const config = clue.multipleChoice;
      if (!config) {
        ctx.addIssue({
          code: "custom",
          message: "Multiple-choice clues require answer options.",
          path: ["multipleChoice"],
        });
        return;
      }

      const ids = config.options.map((option) => option.id);
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
          code: "custom",
          message: "Multiple-choice option IDs must be unique.",
          path: ["multipleChoice", "options"],
        });
      }

      if (!ids.includes(config.correctOptionId)) {
        ctx.addIssue({
          code: "custom",
          message: "Select one of the options as the correct answer.",
          path: ["multipleChoice", "correctOptionId"],
        });
      }
    }
  })

export const storedHuntSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  cluesCount: z.number(),
  category: z
    .enum(["Urban", "Campus", "Office", "Museum", "General"])
    .optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  status: huntStatusSchema,
  rewardType: rewardTypeSchema,
  sequential: z.boolean().optional(),
  rewardPool: z.number().optional(),
  rewards: z.array(rewardSchema).optional(),
  rewardEscrowTxHash: z.string().optional(),
  rewardEscrowBalance: z.number().optional(),
  playerCount: z.number().optional(),
  maxParticipants: z.number().optional(),
  maxCapacity: z.number().optional(),
  createdAt: z.number().optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  gracePeriodSeconds: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe(
      "Seconds after endTime during which the creator can reclaim unclaimed rewards"
    ),
  creatorEmail: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  is_private: z.boolean().optional(),
  remotePlayable: z.boolean().optional(),
  coverImageCid: z.string().optional(),
  isFeaturedOfWeek: z.boolean().optional(),
  sponsors: z.array(z.string()).optional(),
})

export const playerProgressSchema = z.object({
  hunt_id: z.number(),
  player: z.string(),
  current_clue_index: z.number(),
  completed: z.boolean(),
  reward_claimed: z.boolean(),
})

export const achievementIdSchema = z.enum([
  "first_hunt_completed",
  "first_win",
  "five_wins",
  "ten_wins",
  "twenty_five_wins",
  "first_nft",
  "high_scorer",
  "speed_hunter",
  "veteran",
  "legend",
])

export const achievementSchema = z.object({
  id: achievementIdSchema,
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  rarity: z.enum(["common", "uncommon", "rare", "epic", "legendary"]),
  condition: z.string(),
})

/** Convenience map so callers can look up a schema by domain name. */
export const schemas = {
  reward: rewardSchema,
  clue: clueSchema,
  storedHunt: storedHuntSchema,
  playerProgress: playerProgressSchema,
  achievement: achievementSchema,
} as const
