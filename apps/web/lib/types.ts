/**
 * Compatibility barrel for shared web application types.
 *
 * Types are grouped by responsibility under `lib/types/`; existing
 * `@/lib/types` imports remain supported.
 */

export type { HuntCategoryId } from "./categories";
export type { CollaboratorRole } from "./collaboration";
export type { AnswerStrictness } from "./fuzzyAnswer";
export * from "./types/attempts";
export * from "./types/chat";
export * from "./types/clues";
export * from "./types/hunt-ui";
export * from "./types/hunts";
export * from "./types/leaderboard";
export * from "./types/performance";
export * from "./types/players";
export * from "./types/rewards";
export * from "./types/seasons";
export * from "./types/transactions";
export type {
  Achievement,
  AchievementId,
  AchievementRarity,
  HuntCategory,
  HuntInvite,
  HuntProgressStatus,
  PlayerHuntProgress,
  PlayerProgress,
  RewardHistoryEntry,
  RewardHistoryType,
  RewardReceipt,
  RewardReceiptType,
  RewardType,
  SponsorContribution,
} from "@hunty/types";
