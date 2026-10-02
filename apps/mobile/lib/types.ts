import type { Clue, ClueInfo, PlayerHuntProgress, StoredHunt } from '@hunty/types';

export type { Clue, ClueInfo, PlayerHuntProgress, StoredHunt };

export interface NftRewardDetail {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  imageUri?: string;
  earnedAt?: string;
  claimed: boolean;
  huntName?: string;
  metadata?: Record<string, unknown>;
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
