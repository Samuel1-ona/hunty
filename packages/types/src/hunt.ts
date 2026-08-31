/**
 * Hunt domain types shared across web and mobile.
 */

import type { Reward, RewardType } from "./reward";

export type HuntStatus =
  | "Active"
  | "Completed"
  | "Draft"
  | "Cancelled"
  | "PendingReview"
  | "Scheduled"
  | "Ended";

/** Broad hunt category used in discovery filters. */
export type HuntCategory = "Urban" | "Campus" | "Office" | "Museum" | "General";

/** Overall hunt difficulty tag used in discovery filters. */
export type HuntDifficulty = "Easy" | "Medium" | "Hard";

/** A revocable bearer token used to access a private hunt. */
export interface HuntInvite {
  /** Opaque UUID embedded in the private-hunt invite URL. */
  token: string;
  /** Unix timestamp in milliseconds when the invite was generated. */
  createdAt: number;
  /** Unix timestamp in milliseconds after which the invite is no longer accepted. */
  expiresAt: number;
}

/** The canonical persisted shape of a hunt. */
export interface StoredHunt {
  id: number;
  title: string;
  description: string;
  cluesCount: number;
  /** Broad hunt category used in discovery filters. */
  category?: HuntCategory;
  /** Overall hunt difficulty tag used in discovery filters. */
  difficulty?: HuntDifficulty;
  status: HuntStatus;
  rewardType: RewardType;
  /** When true, players must solve clues in order. */
  sequential?: boolean;
  /** Total reward pool value used for creator-side sorting. */
  rewardPool?: number;
  /** Per-place XLM reward buckets funded by the creator. */
  rewards?: Reward[];
  /** Escrow transaction hash proving the creator funded the XLM reward pool. */
  rewardEscrowTxHash?: string;
  /** Amount still available in the XLM escrow. */
  rewardEscrowBalance?: number;
  /** Creator-side participant count snapshot for dashboard sorting. */
  playerCount?: number;
  /** Max number of participants for limited spots. */
  maxParticipants?: number;
  /** @deprecated Use `maxParticipants`. */
  maxCapacity?: number;
  /** Unix timestamp in seconds when the hunt draft was created locally. */
  createdAt?: number;
  /** Unix timestamp in seconds — when the hunt starts. */
  startTime?: number;
  /** Unix timestamp in seconds — when the hunt ends. */
  endTime?: number;
  creatorEmail?: string;
  emailNotifications?: boolean;
  /** When true, the hunt is hidden from the public arcade grid. */
  is_private?: boolean;
  /** The active private-hunt invite. Replaced on regeneration and removed on revoke. */
  invite?: HuntInvite;
  /** Optional game cover CID/URL for hunt cards and sharing previews. */
  coverImageCid?: string;
  /** Active editorial banner showcase at the top of the Arcade. */
  isFeaturedOfWeek?: boolean;
  /**
   * Grace period in seconds after `endTime` during which unclaimed rewards
   * remain escrowed. Once this window expires the creator may call the
   * refund endpoint to reclaim the remaining escrow balance.
   * Defaults to 604800 (7 days) when not explicitly set.
   */
  gracePeriodSeconds?: number;
  /**
   * Sponsors that have contributed to this hunt's reward pool.
   * Each entry is the sponsor's Stellar wallet address.
   */
  sponsors?: string[];
}

/** Lightweight hunt projection used by list/detail views. */
export interface HuntInfo {
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
}

/** Editable draft clue used while building a hunt. */
export interface HuntDraft {
  id: number;
  title: string;
  description: string;
  link: string;
  code: string;
  image?: string;
  sequential?: boolean;
  maxParticipants?: number;
}
