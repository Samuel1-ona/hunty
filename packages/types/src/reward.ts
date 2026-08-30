/**
 * Reward domain types.
 *
 * Platform-agnostic: these describe the on-chain / stored shape of a reward
 * bucket and its history. UI-only concerns (such as a rendered icon node) are
 * layered on top by each consuming app.
 */

/** How a hunt pays out to winners. */
export type RewardType = 'XLM' | 'NFT' | 'Both';

/** A single reward bucket funded by the hunt creator for a given placement. */
export interface Reward {
  /** Finishing place this bucket rewards (1 = first). */
  place: number;
  /** Amount awarded for the placement (XLM for token rewards). */
  amount: number;
}

export type RewardReceiptType = 'deposit' | 'distribution' | 'claim' | 'refund';

export interface RewardReceipt {
  id: string;
  huntId: number;
  type: RewardReceiptType;
  txHash: string;
  amount: number;
  from?: string;
  to?: string;
  rank?: number;
  createdAt: number;
}

export type RewardHistoryType = 'XLM' | 'NFT';

export interface RewardHistoryEntry {
  id: string;
  type: RewardHistoryType;
  amount?: number;
  description: string;
  txHash: string;
  earnedAt: string;
  huntId?: number;
  huntName?: string;
  recipient?: string;
  explorerUrl: string;
}

/**
 * A third-party sponsor contribution to a hunt's reward pool.
 * Sponsor funds are tracked separately from creator funds so attribution
 * can be displayed independently.
 */
export interface SponsorContribution {
  /** Unique identifier for this contribution record. */
  id: string;
  huntId: number;
  /** Stellar wallet address of the sponsoring party. */
  sponsor: string;
  /** Amount contributed in XLM stroops. */
  amount: number;
  /** On-chain transaction hash of the sponsorship deposit. */
  txHash: string;
  /** Unix timestamp in milliseconds when the contribution was made. */
  createdAt: number;
}
