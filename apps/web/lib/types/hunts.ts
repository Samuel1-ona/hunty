import type { HuntCategory as DomainHuntCategory, HuntInvite } from "@hunty/types";

import type { HuntCategoryId } from "../categories";
import type { HuntCollaborator } from "../collaboration";
import type { Reward } from "./rewards";

export interface HuntReview {
  id: string;
  huntId: number;
  playerAddress: string;
  rating: number; // 1 to 5
  text?: string;
  difficultyRating?: HuntDifficulty | "";
  createdAt: number;
  moderated?: boolean;
  flagged?: boolean;
  upvotes?: number;
  upvotedBy?: string[];
}

export type HuntStatus =
  | "Active"
  | "Completed"
  | "Draft"
  | "Cancelled"
  | "PendingReview"
  | "scheduled"
  | "active"
  | "ended";

/**
 * Hunt-level difficulty rating set by the creator so players can gauge
 * challenge before joining. Independent of `ClueDifficulty` which rates
 * individual clues. Older hunts without a difficulty field render as
 * unrated (no badge).
 */
export type HuntDifficulty = "Easy" | "Medium" | "Hard" | "Expert";

export type HuntAgeClassification = "all-ages" | "13-plus" | "16-plus" | "18-plus";

export interface StoredHunt {
  id: number;
  title: string;
  description: string;
  cluesCount: number;
  /** Broad hunt category used in discovery filters. */
  category?: DomainHuntCategory | HuntCategoryId;
  /** Overall hunt difficulty tag used in discovery filters. */
  difficulty?: HuntDifficulty;
  /** Age suitability selected by the creator. Older hunts default to all ages. */
  ageClassification?: HuntAgeClassification;
  status: HuntStatus;
  rewardType: "XLM" | "NFT" | "Both";
  /** When true, players must solve clues in order. */
  sequential?: boolean;
  /** Total reward pool value used for creator-side sorting. */
  rewardPool?: number;
  /** Per-place XLM reward buckets funded by the creator. */
  rewards?: Reward[];
  /** Reward distribution plan for the pool. */
  rewardDistribution?: Reward[];
  /** Current balance in the reward pool. */
  poolBalance?: number;
  /** Low balance threshold for the pool. */
  poolLowBalanceThreshold?: number;
  /** Escrow transaction hash proving the creator funded the XLM reward pool. */
  rewardEscrowTxHash?: string;
  /** Amount still available in the XLM escrow. */
  rewardEscrowBalance?: number;
  /** Creator-side participant count snapshot for dashboard sorting. */
  playerCount?: number;
  /** Max number of participants for limited spots. */
  maxParticipants?: number;
  /** @deprecated Use `maxParticipants`. Kept for older stored hunts. */
  maxCapacity?: number;
  /** Unix timestamp in seconds when the hunt draft was created locally. */
  createdAt?: number;
  /** Unix timestamp in seconds — when the hunt starts. */
  startTime?: number;
  /** Unix timestamp in seconds — when the hunt ends. */
  endTime?: number;
  /** Canonical UTC timestamp for scheduled lifecycle transitions. */
  startAt?: number;
  /** Canonical UTC timestamp for scheduled lifecycle transitions. */
  endAt?: number;
  /** Seconds after the hunt ends before unclaimed rewards can be reclaimed. */
  gracePeriodSeconds?: number;
  creatorEmail?: string;
  emailNotifications?: boolean;
  /** When true, the hunt is hidden from the public arcade grid. */
  is_private?: boolean;
  /** The active private-hunt invite. Replaced on regeneration and removed on revoke. */
  invite?: HuntInvite;
  /** Optional game cover CID/URL for hunt cards and sharing previews. */
  coverImageCid?: string;
  /** Optional map latitude for spatial discovery views. */
  mapLatitude?: number;
  /** Optional map longitude for spatial discovery views. */
  mapLongitude?: number;
  /** Active editorial banner showcase at the top of the Arcade. */
  isFeaturedOfWeek?: boolean;
  /** Unix timestamp in seconds until a paid spotlight placement remains active. */
  promotedUntil?: number;
  /** Creator's wallet public key. */
  creator?: string;
  /** Average user rating (1-5). */
  averageRating?: number;
  /** Average user difficulty rating (1-4). */
  averageDifficulty?: number;
  /** Number of user reviews. */
  reviewCount?: number;
  /** When true, the hunt is archived (hidden from public but data preserved). */
  isArchived?: boolean;
  /** Unix timestamp in seconds when the hunt was soft-deleted. */
  deletedAt?: number;
  /** Recovery window in seconds (default: 30 days = 2592000 seconds). */
  recoveryWindow?: number;
  /** Free-form discovery tags (normalized kebab-case). */
  tags?: string[];
  /** Primary owner wallet (Stellar G-address). */
  ownerAddress?: string;
  /** Collaborators snapshot (authoritative list may live in collaboration store). */
  collaborators?: HuntCollaborator[];
}

export type HuntInfo = {
  id: number;
  title: string;
  description: string;
  totalClues: number;
  status: string;
  sequential?: boolean;
  startTime?: number;
  endTime?: number;
  creatorEmail?: string;
  emailNotifications?: boolean;
  difficulty?: HuntDifficulty;
};
