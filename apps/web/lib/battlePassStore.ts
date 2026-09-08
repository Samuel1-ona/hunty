import { getSeasonById } from "./seasonStore";
import type { Reward, Season } from "./types";

export const XP_PER_HUNT = 100;
const DEFAULT_TIERS = 10;

export interface SeasonTier {
  tier: number;
  requiredXp: number;
  reward: Reward | null;
}

export interface PlayerBattlePassProgress {
  address: string;
  seasonId: number;
  xp: number;
  claimedTiers: number[];
}

const progressStore = new Map<string, PlayerBattlePassProgress>();

function key(seasonId: number, address: string) {
  return `${seasonId}:${address.toLowerCase()}`;
}

function getOrCreateProgress(seasonId: number, address: string): PlayerBattlePassProgress {
  const k = key(seasonId, address);
  let progress = progressStore.get(k);
  if (!progress) {
    progress = {
      address,
      seasonId,
      xp: 0,
      claimedTiers: [],
    };
    progressStore.set(k, progress);
  }
  return progress;
}

export function getBattlePassTiers(season: Season): SeasonTier[] {
  const rewards = season.rewards ?? [];
  const tiers: SeasonTier[] = [];
  for (let i = 1; i <= DEFAULT_TIERS; i++) {
    const requiredXp = i * 500;
    const reward = rewards[i - 1] ?? null;
    tiers.push({ tier: i, requiredXp, reward });
  }
  return tiers;
}

export function getPlayerProgress(seasonId: number, address: string): PlayerBattlePassProgress {
  return getOrCreateProgress(seasonId, address);
}

export function awardXp(seasonId: number, address: string, xp: number): PlayerBattlePassProgress {
  const progress = getOrCreateProgress(seasonId, address);
  progress.xp += xp;
  return progress;
}

export function claimTierReward(seasonId: number, address: string, tierIndex: number): PlayerBattlePassProgress {
  const season = getSeasonById(seasonId);
  if (!season) {
    throw new Error("Season not found");
  }
  const tiers = getBattlePassTiers(season);
  if (tierIndex < 0 || tierIndex >= tiers.length) {
    throw new Error("Invalid tier");
  }
  const tier = tiers[tierIndex];
  const progress = getOrCreateProgress(seasonId, address);
  if (progress.xp < tier.requiredXp) {
    throw new Error("Tier not reached");
  }
  if (progress.claimedTiers.includes(tierIndex)) {
    throw new Error("Already claimed");
  }
  progress.claimedTiers.push(tierIndex);
  return progress;
}
