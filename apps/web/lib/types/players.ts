export interface PlayerProfile {
  address: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface ReferralRecord {
  code: string;
  referrerAddress: string;
  referredAddress: string;
  registeredAt: number;
  firstCompletedAt?: number;
  firstCompletedHuntId?: number;
  bonusAwarded: boolean;
  bonusPoints: number;
}

export interface ReferralStats {
  code: string;
  totalInvites: number;
  successfulReferrals: number;
  pendingReferrals: number;
  bonusPoints: number;
  referralLink: string;
  referrals: ReferralRecord[];
}

// ─── Referral Leaderboard ─────────────────────────────────────────────────────

export type ReferralLeaderboardPeriod = "all" | "week" | "month";

export type ReferralPayoutStatus = "pending" | "processing" | "paid" | "failed";

/** A single row in the referral leaderboard. */
export interface ReferralLeaderboardEntry {
  /** 1-based rank using standard competition ranking (ties share a rank). */
  rank: number;
  /** Stellar G-address of the referrer. */
  referrerAddress: string;
  /** Optional resolved display name. */
  displayName?: string;
  /** Number of referred players who completed at least one hunt. */
  successfulReferrals: number;
  /** Total number of referred players (including pending). */
  totalInvites: number;
  /** Accumulated bonus points awarded to this referrer. */
  bonusPoints: number;
  /** Unix timestamp (ms) of the most recent referral activity. */
  lastActiveAt: number;
  /** Payout status for this period. */
  rewardPayoutStatus?: ReferralPayoutStatus;
  /** Reward amount pending or paid out. */
  rewardAmount?: number;
}

/** Aggregate stats describing the referral leaderboard. */
export interface ReferralLeaderboardStats {
  totalReferrers: number;
  totalSuccessfulReferrals: number;
  totalBonusDistributed: number;
  /** XLM amount in the active referral reward pool. */
  activeRewardPool: number;
}

/** A processed reward payout record for a top referrer. */
export interface ReferralPayoutRecord {
  /** Unique payout ID. */
  id: string;
  /** Period this payout covers. */
  period: "weekly" | "monthly" | "seasonal" | "manual";
  /** Stellar G-address of the rewarded referrer. */
  referrerAddress: string;
  /** Final rank position used to determine this reward. */
  rank: number;
  /** Amount awarded. */
  rewardAmount: number;
  /** Reward type. */
  rewardType: "xlm" | "points";
  /** Current status of the payout. */
  status: ReferralPayoutStatus;
  /** Unix timestamp (ms) when the payout was created. */
  createdAt: number;
  /** Unix timestamp (ms) when the payout was executed. null until processed. */
  processedAt?: number;
  /** Optional transaction hash if paid via XLM. */
  txHash?: string;
}

// ─── Player Count ────────────────────────────────────────────────────────────

/**
 * Player count above which a hunt is considered "Trending".
 * @deprecated Import from `@/lib/config/constants` instead: `PLAYER_COUNT.TRENDING_THRESHOLD`
 */
export const TRENDING_PLAYER_THRESHOLD = 50;

/**
 * How long a fetched player count is considered fresh (ms).
 * @deprecated Import from `@/lib/config/constants` instead: `PLAYER_COUNT.CACHE_TTL_MS`
 */
export const PLAYER_COUNT_CACHE_TTL_MS = 60_000;

export interface PlayerCountResult {
  huntId: string;
  count: number;
  /**
   * `true` when `count >= TRENDING_PLAYER_THRESHOLD`.
   *
   * Computed at fetch time and cached alongside the count, so the badge
   * reflects the same snapshot as the displayed number. Re-evaluated on
   * every cache miss (stale or absent entry).
   */
  isTrending: boolean;
  fetchedAt: number; // Date.now() at time of fetch
  isLoading: boolean;
  error: string | null;
}

// ─── Profile Dashboard Types ───────────────────────────────────────────────────
// HuntProgressStatus and PlayerHuntProgress now live in @hunty/types.

export interface NftAttribute {
  trait_type: string;
  value: string | number;
}

export interface NftRewardDetail {
  id: number;
  name: string;
  description?: string;
  imageUri: string;
  earnedAt: string;
  claimed: boolean;
  huntName?: string;
  attributes?: NftAttribute[];
  /** ipfs:// URI pointing to the SEP-0039 metadata JSON file for this NFT. */
  metadataUri?: string;
}

export interface ProfileSummary {
  totalHunts: number;
  completedHunts: number;
  inProgressHunts: number;
  totalPoints: number;
  completionRate: number;
  totalNftRewards: number;
  claimedNftRewards: number;
  unclaimedNftRewards: number;
}
