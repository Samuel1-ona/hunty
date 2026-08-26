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

export const rewardSchema = z.object({
  place: z.number(),
  amount: z.number(),
})

export const clueSchema = z.object({
  id: z.number(),
  huntId: z.number(),
  question: z.string(),
  answer: z.string(),
  points: z.number(),
  hint: z.string().optional(),
  hintCost: z.number().optional(),
  difficulty: clueDifficultySchema.optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  geofenceRadiusMeters: z.number().optional(),
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
  creatorEmail: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  is_private: z.boolean().optional(),
  coverImageCid: z.string().optional(),
  isFeaturedOfWeek: z.boolean().optional(),
  gracePeriodSeconds: z.number().int().min(0).optional(),
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
