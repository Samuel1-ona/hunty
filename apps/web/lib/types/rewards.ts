import type { Reward as DomainReward } from "@hunty/types";
import type { ReactNode } from "react";

/**
 * Web-facing reward bucket. Extends the shared domain {@link DomainReward}
 * with an optional rendered icon node used by the reward panels. The plain
 * `{ place, amount }` domain shape (and the receipt/history types) live in
 * `@hunty/types`.
 */
export interface Reward extends DomainReward {
  icon?: ReactNode;
}

export interface RewardPlayerProgress {
  is_completed: boolean;
  reward_claimed: boolean;
  hunt_id?: number | string;
  reward_amount?: number;
}

// ─── Activity Feed ───────────────────────────────────────────────────────────

export type ActivityEventType = "HuntCompleted" | "ClueCompleted" | "HuntSponsored";

export interface ActivityEvent {
  id: string;
  /** Full Stellar G-address of the participant */
  address: string;
  /** Optional display name resolved from the player's profile */
  displayName?: string;
  huntTitle: string;
  huntId: number;
  timestamp: number;
  type: ActivityEventType;
  /** Amount for sponsored events */
  amount?: number;
}
