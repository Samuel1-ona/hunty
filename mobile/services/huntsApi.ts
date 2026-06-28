import type { StoredHunt } from '@lib/types';
import { fetchActiveHuntsFromIndexer, fetchHuntByIdFromIndexer } from '@/lib/graphql/hunts';
import { getActiveHuntsForFeed, getHuntById } from '@store/huntStore';

// ---- Reward tier system types and helpers ----

export interface RewardTier {
  name: 'Gold' | 'Silver' | 'Bronze' | 'Participation';
  minCompletionTime?: number;  // seconds, null/undefined for participation
  minScore?: number;
  rewardAmount: number;
  rewardToken: string;  // e.g. 'HUNT' or 'USDC'
  nftDesignUrl?: string;
}

export interface HuntWithTiers extends StoredHunt {
  rewardTiers: RewardTier[];
}

/**
 * Enhance a StoredHunt with reward tier information.
 * In a real implementation this would come from the backend or be configured per hunt.
 * Here we merge default tiers as a demonstration.
 */
function attachRewardTiers(hunt: StoredHunt): HuntWithTiers {
  const defaultTiers: RewardTier[] = [
    {
      name: 'Gold',
      minScore: 90,
      rewardAmount: 100,
      rewardToken: 'HUNT',
      nftDesignUrl: 'https://example.com/nft/gold.png',
    },
    {
      name: 'Silver',
      minScore: 70,
      rewardAmount: 50,
      rewardToken: 'HUNT',
      nftDesignUrl: 'https://example.com/nft/silver.png',
    },
    {
      name: 'Bronze',
      minScore: 50,
      rewardAmount: 25,
      rewardToken: 'HUNT',
      nftDesignUrl: 'https://example.com/nft/bronze.png',
    },
    {
      name: 'Participation',
      rewardAmount: 10,
      rewardToken: 'HUNT',
    },
  ];

  return { ...hunt, rewardTiers: defaultTiers };
}

// ---- Overridden API functions ----

/**
 * Fetch active hunts with reward tier information.
 */
export async function getActiveHuntsNetworkFirst(): Promise<HuntWithTiers[]> {
  try {
    const hunts = await fetchActiveHuntsFromIndexer();
    if (hunts.length > 0) return hunts.map(attachRewardTiers);
  } catch (error) {
    console.warn('[huntsApi] GraphQL fetch failed, using local fallback:', error);
  }
  const localHunts = getActiveHuntsForFeed();
  return localHunts.map(attachRewardTiers);
}

export async function getHuntNetworkFirst(id: number): Promise<HuntWithTiers | undefined> {
  try {
    const hunt = await fetchHuntByIdFromIndexer(id);
    if (hunt) return attachRewardTiers(hunt);
  } catch (error) {
    console.warn('[huntsApi] GraphQL hunt fetch failed, using local fallback:', error);
  }
  const localHunt = getHuntById(id);
  if (localHunt) return attachRewardTiers(localHunt);
  return undefined;
}
