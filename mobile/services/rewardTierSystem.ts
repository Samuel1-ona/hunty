// Reward Tier System
// Provides types and utilities for tiered rewards based on performance.

export interface RewardTierConfig {
  name: 'Gold' | 'Silver' | 'Bronze' | 'Participation';
  minCompletionTime?: number;   // seconds, undefined for Participation
  minScore?: number;            // percentage (0-100), undefined for Participation
  rewardAmount: number;
  rewardToken: string;
  nftDesignUrl?: string;
}

/**
 * Determine the highest tier a user qualifies for based on score and completion time.
 */
export function determineTier(
  score: number,
  completionTimeSeconds: number,
  tiers: RewardTierConfig[]
): RewardTierConfig | null {
  // Filter to non-participation tiers, sorted by minScore descending
  const performanceTiers = tiers
    .filter(t => t.name !== 'Participation')
    .sort((a, b) => (b.minScore ?? 0) - (a.minScore ?? 0));

  for (const tier of performanceTiers) {
    const scoreOK = tier.minScore === undefined || score >= tier.minScore;
    const timeOK = tier.minCompletionTime === undefined || completionTimeSeconds <= tier.minCompletionTime;
    if (scoreOK && timeOK) {
      return tier;
    }
  }
  // Fallback to Participation tier if no performance tier matches
  return tiers.find(t => t.name === 'Participation') ?? null;
}

/**
 * Get the participation reward tier (always present).
 */
export function getParticipationTier(tiers: RewardTierConfig[]): RewardTierConfig | undefined {
  return tiers.find(t => t.name === 'Participation');
}
