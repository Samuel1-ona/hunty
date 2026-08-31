/**
 * Runtime type guards and assertion functions for the shared domain types.
 *
 * These are dependency-free (no Zod) so they can be consumed by both the web
 * and mobile apps without pulling a validation library into the bundle. For
 * full schema validation of untrusted input, use the Zod schemas exported from
 * `@hunty/types/schemas`.
 */

import type { Clue } from "./clue"
import type { HuntStatus, StoredHunt } from "./hunt"
import type { Achievement, AchievementId, AchievementRarity } from "./achievement"
import type { PlayerProgress } from "./player"
import type { Reward, RewardType } from "./reward"

const HUNT_STATUSES: readonly HuntStatus[] = [
  "Active",
  "Completed",
  "Draft",
  "Cancelled",
  "PendingReview",
  "Scheduled",
  "Ended",
]

const REWARD_TYPES: readonly RewardType[] = ["XLM", "NFT", "Both"]

const ACHIEVEMENT_IDS: readonly AchievementId[] = [
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
]

const ACHIEVEMENT_RARITIES: readonly AchievementRarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function isHuntStatus(value: unknown): value is HuntStatus {
  return (
    typeof value === "string" &&
    (HUNT_STATUSES as readonly string[]).includes(value)
  )
}

export function isRewardType(value: unknown): value is RewardType {
  return (
    typeof value === "string" &&
    (REWARD_TYPES as readonly string[]).includes(value)
  )
}

export function isAchievementId(value: unknown): value is AchievementId {
  return (
    typeof value === "string" &&
    (ACHIEVEMENT_IDS as readonly string[]).includes(value)
  )
}

export function isReward(value: unknown): value is Reward {
  return (
    isRecord(value) &&
    typeof value.place === "number" &&
    typeof value.amount === "number"
  )
}

export function isClue(value: unknown): value is Clue {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.huntId === "number" &&
    typeof value.question === "string" &&
    typeof value.answer === "string" &&
    typeof value.points === "number"
  )
}

export function isStoredHunt(value: unknown): value is StoredHunt {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.cluesCount === "number" &&
    isHuntStatus(value.status) &&
    isRewardType(value.rewardType) &&
    (value.rewards === undefined ||
      (Array.isArray(value.rewards) && value.rewards.every(isReward)))
  )
}

export function isPlayerProgress(value: unknown): value is PlayerProgress {
  return (
    isRecord(value) &&
    typeof value.hunt_id === "number" &&
    typeof value.player === "string" &&
    typeof value.current_clue_index === "number" &&
    typeof value.completed === "boolean" &&
    typeof value.reward_claimed === "boolean"
  )
}

export function isAchievement(value: unknown): value is Achievement {
  return (
    isRecord(value) &&
    isAchievementId(value.id) &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.icon === "string" &&
    typeof value.rarity === "string" &&
    (ACHIEVEMENT_RARITIES as readonly string[]).includes(value.rarity) &&
    typeof value.condition === "string"
  )
}

// ─── Assertion functions ─────────────────────────────────────────────────────

function fail(label: string, value: unknown): never {
  const received =
    value === null ? "null" : Array.isArray(value) ? "array" : typeof value
  throw new TypeError(`Expected ${label}, received ${received}`)
}

export function assertStoredHunt(value: unknown): asserts value is StoredHunt {
  if (!isStoredHunt(value)) fail("StoredHunt", value)
}

export function assertClue(value: unknown): asserts value is Clue {
  if (!isClue(value)) fail("Clue", value)
}

export function assertReward(value: unknown): asserts value is Reward {
  if (!isReward(value)) fail("Reward", value)
}

export function assertPlayerProgress(
  value: unknown,
): asserts value is PlayerProgress {
  if (!isPlayerProgress(value)) fail("PlayerProgress", value)
}

export function assertAchievement(
  value: unknown,
): asserts value is Achievement {
  if (!isAchievement(value)) fail("Achievement", value)
}
