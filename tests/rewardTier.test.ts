import { describe, it, expect } from "vitest";

// ==========================================
// --- 1. CORE TYPES & IMPLEMENTATION ---
// ==========================================

export type RewardTier = "GOLD" | "SILVER" | "BRONZE" | "PARTICIPATION";

export interface TierConfig {
  tier: RewardTier;
  minScore: number;
  maxCompletionTimeSec: number;
  rewardAmount: number;
  nftDesignId: string;
}

export interface HuntSubmission {
  score: number;
  completionTimeSec: number;
}

export interface CalculatedReward {
  tier: RewardTier;
  rewardAmount: number;
  nftDesignId: string;
}

// Canonical tier configuration satisfying different reward amounts and NFT designs per tier
const DEFAULT_TIER_CONFIGS: TierConfig[] = [
  { tier: "GOLD", minScore: 90, maxCompletionTimeSec: 300, rewardAmount: 100, nftDesignId: "nft_gold_epic" },
  { tier: "SILVER", minScore: 75, maxCompletionTimeSec: 600, rewardAmount: 50, nftDesignId: "nft_silver_rare" },
  { tier: "BRONZE", minScore: 50, maxCompletionTimeSec: 1200, rewardAmount: 25, nftDesignId: "nft_bronze_common" },
  { tier: "PARTICIPATION", minScore: 0, maxCompletionTimeSec: Infinity, rewardAmount: 5, nftDesignId: "nft_participation_base" },
];

export class RewardTierSystem {
  /**
   * Evaluates user performance against thresholds to determine tier, amounts, and NFT metadata
   */
  public static calculateReward(submission: HuntSubmission, configs: TierConfig[] = DEFAULT_TIER_CONFIGS): CalculatedReward {
    // Check Gold
    const gold = configs.find(c => c.tier === "GOLD")!;
    if (submission.score >= gold.minScore && submission.completionTimeSec <= gold.maxCompletionTimeSec) {
      return { tier: "GOLD", rewardAmount: gold.rewardAmount, nftDesignId: gold.nftDesignId };
    }

    // Check Silver
    const silver = configs.find(c => c.tier === "SILVER")!;
    if (submission.score >= silver.minScore && submission.completionTimeSec <= silver.maxCompletionTimeSec) {
      return { tier: "SILVER", rewardAmount: silver.rewardAmount, nftDesignId: silver.nftDesignId };
    }

    // Check Bronze
    const bronze = configs.find(c => c.tier === "BRONZE")!;
    if (submission.score >= bronze.minScore && submission.completionTimeSec <= bronze.maxCompletionTimeSec) {
      return { tier: "BRONZE", rewardAmount: bronze.rewardAmount, nftDesignId: bronze.nftDesignId };
    }

    // Fallback: Participation reward for all other completers
    const participation = configs.find(c => c.tier === "PARTICIPATION")!;
    return { tier: "PARTICIPATION", rewardAmount: participation.rewardAmount, nftDesignId: participation.nftDesignId };
  }

  /**
   * Provides tier preview configuration metadata for display in Hunt details panels
   */
  public static getTierPreviews(configs: TierConfig[] = DEFAULT_TIER_CONFIGS) {
    return configs.map(c => ({
      tier: c.tier,
      rewardAmount: c.rewardAmount,
      nftDesignId: c.nftDesignId,
      condition: `Score ≥ ${c.minScore}${c.maxCompletionTimeSec === Infinity ? "" : ` & Time ≤ ${c.maxCompletionTimeSec}s`}`
    }));
  }
}

// ==========================================
// --- 2. TDD AUTOMATED TEST SUITE ---
// ==========================================

describe("Issue #622 - Reward Tier System TDD Tests", () => {
  it("should assign GOLD tier for high scores achieved within fast completion times", () => {
    const res = RewardTierSystem.calculateReward({ score: 95, completionTimeSec: 250 });
    expect(res.tier).toBe("GOLD");
    expect(res.rewardAmount).toBe(100);
    expect(res.nftDesignId).toBe("nft_gold_epic");
  });

  it("should downgrade to SILVER tier if score is sufficient but time threshold is missed", () => {
    const res = RewardTierSystem.calculateReward({ score: 95, completionTimeSec: 400 });
    expect(res.tier).toBe("SILVER");
    expect(res.rewardAmount).toBe(50);
  });

  it("should fallback cleanly to BRONZE for moderate performance metrics", () => {
    const res = RewardTierSystem.calculateReward({ score: 60, completionTimeSec: 1000 });
    expect(res.tier).toBe("BRONZE");
    expect(res.rewardAmount).toBe(25);
    expect(res.nftDesignId).toBe("nft_bronze_common");
  });

  it("should ensure a base participation reward is granted to all low-scoring completers", () => {
    const res = RewardTierSystem.calculateReward({ score: 10, completionTimeSec: 5000 });
    expect(res.tier).toBe("PARTICIPATION");
    expect(res.rewardAmount).toBe(5);
    expect(res.nftDesignId).toBe("nft_participation_base");
  });

  it("should correctly render formatted string tier configurations for hunt preview panels", () => {
    const previews = RewardTierSystem.getTierPreviews();
    expect(previews).toHaveLength(4);
    expect(previews[0].tier).toBe("GOLD");
    expect(previews[0].condition).toContain("Score ≥ 90");
  });
});