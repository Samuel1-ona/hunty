import { describe, expect, it } from "vitest";
import { z } from "zod";

import type {
  Achievement,
  AchievementId,
  AchievementRarity,
  Clue,
  ClueDifficulty,
  HuntStatus,
  PlayerProgress,
  Reward,
  RewardType,
  StoredHunt,
} from "../src/index";
import {
  achievementIdSchema,
  achievementSchema,
  clueDifficultySchema,
  clueSchema,
  huntStatusSchema,
  playerProgressSchema,
  rewardSchema,
  rewardTypeSchema,
  schemas,
  storedHuntSchema,
} from "../src/schemas";

// ── Type compatibility assertions ─────────────────────────────────────────
// Compile-time checks that each schema infers to the same shape as its TS interface.
// These are pure type-level: if the types drift apart the project won't compile.
/* eslint-disable @typescript-eslint/no-unused-vars */

type RewardInfer = z.infer<typeof rewardSchema>;
type _RewardCheck = RewardInfer extends Reward
  ? Reward extends RewardInfer
    ? true
    : false
  : false;
const _rewardTypeCheck: _RewardCheck = true;

type ClueInfer = z.infer<typeof clueSchema>;
type _ClueCheck = ClueInfer extends Clue ? (Clue extends ClueInfer ? true : false) : false;
const _clueTypeCheck: _ClueCheck = true;

type StoredHuntInfer = z.infer<typeof storedHuntSchema>;
type _StoredHuntCheck = StoredHuntInfer extends StoredHunt
  ? StoredHunt extends StoredHuntInfer
    ? true
    : false
  : false;
const _storedHuntTypeCheck: _StoredHuntCheck = true;

type PlayerProgressInfer = z.infer<typeof playerProgressSchema>;
type _PlayerProgressCheck = PlayerProgressInfer extends PlayerProgress
  ? PlayerProgress extends PlayerProgressInfer
    ? true
    : false
  : false;
const _playerProgressTypeCheck: _PlayerProgressCheck = true;

type AchievementInfer = z.infer<typeof achievementSchema>;
type _AchievementCheck = AchievementInfer extends Achievement
  ? Achievement extends AchievementInfer
    ? true
    : false
  : false;
const _achievementTypeCheck: _AchievementCheck = true;

type RewardTypeInfer = z.infer<typeof rewardTypeSchema>;
type _RewardTypeCheck = RewardTypeInfer extends RewardType
  ? RewardType extends RewardTypeInfer
    ? true
    : false
  : false;
const _rewardTypeEnumCheck: _RewardTypeCheck = true;

type HuntStatusInfer = z.infer<typeof huntStatusSchema>;
type _HuntStatusCheck = HuntStatusInfer extends HuntStatus
  ? HuntStatus extends HuntStatusInfer
    ? true
    : false
  : false;
const _huntStatusEnumCheck: _HuntStatusCheck = true;

type ClueDifficultyInfer = z.infer<typeof clueDifficultySchema>;
type _ClueDifficultyCheck = ClueDifficultyInfer extends ClueDifficulty
  ? ClueDifficulty extends ClueDifficultyInfer
    ? true
    : false
  : false;
const _clueDifficultyEnumCheck: _ClueDifficultyCheck = true;

type AchievementIdInfer = z.infer<typeof achievementIdSchema>;
type _AchievementIdCheck = AchievementIdInfer extends AchievementId
  ? AchievementId extends AchievementIdInfer
    ? true
    : false
  : false;
const _achievementIdEnumCheck: _AchievementIdCheck = true;

type AchievementRarityInfer = z.infer<typeof achievementSchema>["rarity"];
type _AchievementRarityCheck = AchievementRarityInfer extends AchievementRarity
  ? AchievementRarity extends AchievementRarityInfer
    ? true
    : false
  : false;
const _achievementRarityCheck: _AchievementRarityCheck = true;

// ── rewardTypeSchema ──────────────────────────────────────────────────────

describe("rewardTypeSchema", () => {
  it("accepts all valid reward types", () => {
    expect(rewardTypeSchema.safeParse("XLM").success).toBe(true);
    expect(rewardTypeSchema.safeParse("NFT").success).toBe(true);
    expect(rewardTypeSchema.safeParse("Both").success).toBe(true);
  });

  it("rejects invalid reward types", () => {
    expect(rewardTypeSchema.safeParse("DOGE").success).toBe(false);
    expect(rewardTypeSchema.safeParse("xlm").success).toBe(false);
    expect(rewardTypeSchema.safeParse("").success).toBe(false);
    expect(rewardTypeSchema.safeParse(null).success).toBe(false);
    expect(rewardTypeSchema.safeParse(undefined).success).toBe(false);
    expect(rewardTypeSchema.safeParse(123).success).toBe(false);
  });
});

// ── huntStatusSchema ──────────────────────────────────────────────────────

describe("huntStatusSchema", () => {
  it("accepts all valid hunt statuses", () => {
    for (const status of [
      "Active",
      "Completed",
      "Draft",
      "Cancelled",
      "PendingReview",
      "Scheduled",
      "Ended",
    ]) {
      expect(huntStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejects invalid hunt statuses", () => {
    expect(huntStatusSchema.safeParse("Paused").success).toBe(false);
    expect(huntStatusSchema.safeParse("Archived").success).toBe(false);
    expect(huntStatusSchema.safeParse("active").success).toBe(false);
    expect(huntStatusSchema.safeParse("scheduled").success).toBe(false);
    expect(huntStatusSchema.safeParse("ended").success).toBe(false);
    expect(huntStatusSchema.safeParse("pending_review").success).toBe(false);
    expect(huntStatusSchema.safeParse("").success).toBe(false);
    expect(huntStatusSchema.safeParse(null).success).toBe(false);
    expect(huntStatusSchema.safeParse(undefined).success).toBe(false);
    expect(huntStatusSchema.safeParse(0).success).toBe(false);
  });
});

// ── clueDifficultySchema ──────────────────────────────────────────────────

describe("clueDifficultySchema", () => {
  it("accepts all valid difficulties", () => {
    expect(clueDifficultySchema.safeParse("Easy").success).toBe(true);
    expect(clueDifficultySchema.safeParse("Medium").success).toBe(true);
    expect(clueDifficultySchema.safeParse("Hard").success).toBe(true);
  });

  it("rejects invalid difficulties", () => {
    expect(clueDifficultySchema.safeParse("Trivial").success).toBe(false);
    expect(clueDifficultySchema.safeParse("easy").success).toBe(false);
    expect(clueDifficultySchema.safeParse("").success).toBe(false);
    expect(clueDifficultySchema.safeParse(null).success).toBe(false);
    expect(clueDifficultySchema.safeParse(undefined).success).toBe(false);
  });
});

// ── rewardSchema ──────────────────────────────────────────────────────────

describe("rewardSchema", () => {
  it("accepts a valid reward", () => {
    const result = rewardSchema.parse({ place: 1, amount: 100 });
    expect(result.place).toBe(1);
    expect(result.amount).toBe(100);
  });

  it("accepts zero amounts", () => {
    expect(rewardSchema.safeParse({ place: 1, amount: 0 }).success).toBe(true);
  });

  it("accepts negative amounts (refund scenarios)", () => {
    expect(rewardSchema.safeParse({ place: 1, amount: -10 }).success).toBe(true);
  });

  it("accepts zero place", () => {
    expect(rewardSchema.safeParse({ place: 0, amount: 50 }).success).toBe(true);
  });

  it("rejects missing fields", () => {
    expect(rewardSchema.safeParse({ place: 1 }).success).toBe(false);
    expect(rewardSchema.safeParse({ amount: 10 }).success).toBe(false);
    expect(rewardSchema.safeParse({}).success).toBe(false);
  });

  it("rejects wrong types", () => {
    expect(rewardSchema.safeParse({ place: "1", amount: 10 }).success).toBe(false);
    expect(rewardSchema.safeParse({ place: 1, amount: "10" }).success).toBe(false);
    expect(rewardSchema.safeParse(null).success).toBe(false);
    expect(rewardSchema.safeParse(undefined).success).toBe(false);
    expect(rewardSchema.safeParse([]).success).toBe(false);
    expect(rewardSchema.safeParse("not an object").success).toBe(false);
  });

  it("rejects extra properties gracefully", () => {
    const result = rewardSchema.safeParse({ place: 1, amount: 10, extra: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("extra");
    }
  });
});

// ── clueSchema ────────────────────────────────────────────────────────────

describe("clueSchema", () => {
  const validClue = {
    id: 1,
    huntId: 2,
    question: "What is the capital of France?",
    answer: "Paris",
    points: 10,
  };

  it("accepts a minimal valid clue", () => {
    const result = clueSchema.parse(validClue);
    expect(result.id).toBe(1);
    expect(result.question).toBe("What is the capital of France?");
  });

  it("accepts a fully-populated clue", () => {
    const full = {
      ...validClue,
      hint: "Think about the Eiffel Tower",
      hintCost: 5,
      difficulty: "Medium" as const,
      latitude: 48.8566,
      longitude: 2.3522,
      geofenceRadiusMeters: 150,
    };
    expect(clueSchema.safeParse(full).success).toBe(true);
  });

  it("accepts all difficulty values", () => {
    expect(clueSchema.safeParse({ ...validClue, difficulty: "Easy" }).success).toBe(true);
    expect(clueSchema.safeParse({ ...validClue, difficulty: "Medium" }).success).toBe(true);
    expect(clueSchema.safeParse({ ...validClue, difficulty: "Hard" }).success).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(clueSchema.safeParse({ id: 1, huntId: 2, question: "Q", answer: "A" }).success).toBe(
      false
    );
    expect(clueSchema.safeParse({ id: 1, huntId: 2, question: "Q", points: 10 }).success).toBe(
      false
    );
    expect(clueSchema.safeParse({ id: 1, huntId: 2, answer: "A", points: 10 }).success).toBe(false);
    expect(clueSchema.safeParse({ id: 1, question: "Q", answer: "A", points: 10 }).success).toBe(
      false
    );
    expect(
      clueSchema.safeParse({ huntId: 2, question: "Q", answer: "A", points: 10 }).success
    ).toBe(false);
  });

  it("rejects wrong types for required fields", () => {
    expect(clueSchema.safeParse({ ...validClue, id: "1" }).success).toBe(false);
    expect(clueSchema.safeParse({ ...validClue, huntId: "2" }).success).toBe(false);
    expect(clueSchema.safeParse({ ...validClue, question: 123 }).success).toBe(false);
    expect(clueSchema.safeParse({ ...validClue, answer: 123 }).success).toBe(false);
    expect(clueSchema.safeParse({ ...validClue, points: "10" }).success).toBe(false);
  });

  it("rejects invalid difficulty enum", () => {
    expect(clueSchema.safeParse({ ...validClue, difficulty: "Impossible" }).success).toBe(false);
    expect(clueSchema.safeParse({ ...validClue, difficulty: "easy" }).success).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(clueSchema.safeParse(null).success).toBe(false);
    expect(clueSchema.safeParse(undefined).success).toBe(false);
    expect(clueSchema.safeParse([]).success).toBe(false);
    expect(clueSchema.safeParse("string").success).toBe(false);
  });

  it("boundary: empty strings for text fields", () => {
    expect(clueSchema.safeParse({ ...validClue, question: "" }).success).toBe(true);
    expect(clueSchema.safeParse({ ...validClue, answer: "" }).success).toBe(true);
  });

  it("boundary: negative points", () => {
    expect(clueSchema.safeParse({ ...validClue, points: -5 }).success).toBe(true);
  });

  it("boundary: zero points", () => {
    expect(clueSchema.safeParse({ ...validClue, points: 0 }).success).toBe(true);
  });

  it("boundary: large point values", () => {
    expect(clueSchema.safeParse({ ...validClue, points: 999999 }).success).toBe(true);
  });
});

// ── storedHuntSchema ──────────────────────────────────────────────────────

describe("storedHuntSchema", () => {
  const validHunt = {
    id: 1,
    title: "City Explorer",
    description: "Find hidden gems downtown",
    cluesCount: 5,
    status: "Active" as const,
    rewardType: "XLM" as const,
  };

  it("accepts a minimal valid hunt", () => {
    const result = storedHuntSchema.parse(validHunt);
    expect(result.title).toBe("City Explorer");
    expect(result.status).toBe("Active");
  });

  it("accepts a fully-populated hunt", () => {
    const full = {
      ...validHunt,
      category: "Urban" as const,
      difficulty: "Hard" as const,
      sequential: true,
      rewardPool: 1000,
      rewards: [{ place: 1, amount: 500 }],
      rewardEscrowTxHash: "abc123",
      rewardEscrowBalance: 500,
      playerCount: 42,
      maxParticipants: 100,
      maxCapacity: 100,
      createdAt: Date.now(),
      startTime: Date.now(),
      endTime: Date.now() + 86400000,
      creatorEmail: "creator@example.com",
      emailNotifications: true,
      is_private: false,
      coverImageCid: "Qm123",
      isFeaturedOfWeek: true,
    };
    expect(storedHuntSchema.safeParse(full).success).toBe(true);
  });

  it("accepts all status values", () => {
    for (const status of [
      "Active",
      "Completed",
      "Draft",
      "Cancelled",
      "PendingReview",
      "Scheduled",
      "Ended",
    ]) {
      expect(storedHuntSchema.safeParse({ ...validHunt, status }).success).toBe(true);
    }
  });

  it("accepts all reward types", () => {
    for (const rewardType of ["XLM", "NFT", "Both"]) {
      expect(storedHuntSchema.safeParse({ ...validHunt, rewardType }).success).toBe(true);
    }
  });

  it("accepts all category values", () => {
    for (const category of ["Urban", "Campus", "Office", "Museum", "General"]) {
      expect(storedHuntSchema.safeParse({ ...validHunt, category }).success).toBe(true);
    }
  });

  it("accepts all difficulty values", () => {
    for (const difficulty of ["Easy", "Medium", "Hard"]) {
      expect(storedHuntSchema.safeParse({ ...validHunt, difficulty }).success).toBe(true);
    }
  });

  it("rejects missing required fields", () => {
    expect(
      storedHuntSchema.safeParse({ id: 1, title: "T", description: "D", cluesCount: 1 }).success
    ).toBe(false);
    expect(
      storedHuntSchema.safeParse({ id: 1, title: "T", description: "D", status: "Active" }).success
    ).toBe(false);
    expect(
      storedHuntSchema.safeParse({
        id: 1,
        title: "T",
        cluesCount: 1,
        status: "Active",
        rewardType: "XLM",
      }).success
    ).toBe(false);
    expect(
      storedHuntSchema.safeParse({
        id: 1,
        description: "D",
        cluesCount: 1,
        status: "Active",
        rewardType: "XLM",
      }).success
    ).toBe(false);
    expect(
      storedHuntSchema.safeParse({
        title: "T",
        description: "D",
        cluesCount: 1,
        status: "Active",
        rewardType: "XLM",
      }).success
    ).toBe(false);
  });

  it("rejects invalid status", () => {
    expect(storedHuntSchema.safeParse({ ...validHunt, status: "Paused" }).success).toBe(false);
    expect(storedHuntSchema.safeParse({ ...validHunt, status: "active" }).success).toBe(false);
  });

  it("rejects invalid rewardType", () => {
    expect(storedHuntSchema.safeParse({ ...validHunt, rewardType: "DOGE" }).success).toBe(false);
  });

  it("rejects invalid category", () => {
    expect(storedHuntSchema.safeParse({ ...validHunt, category: "Outdoor" }).success).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(storedHuntSchema.safeParse(null).success).toBe(false);
    expect(storedHuntSchema.safeParse(undefined).success).toBe(false);
    expect(storedHuntSchema.safeParse([]).success).toBe(false);
    expect(storedHuntSchema.safeParse("string").success).toBe(false);
  });

  it("boundary: empty title and description", () => {
    expect(storedHuntSchema.safeParse({ ...validHunt, title: "", description: "" }).success).toBe(
      true
    );
  });

  it("boundary: zero cluesCount", () => {
    expect(storedHuntSchema.safeParse({ ...validHunt, cluesCount: 0 }).success).toBe(true);
  });

  it("boundary: negative cluesCount", () => {
    expect(storedHuntSchema.safeParse({ ...validHunt, cluesCount: -1 }).success).toBe(true);
  });

  it("boundary: oversized rewards array", () => {
    const bigRewards = Array.from({ length: 1000 }, (_, i) => ({ place: i + 1, amount: 100 }));
    expect(storedHuntSchema.safeParse({ ...validHunt, rewards: bigRewards }).success).toBe(true);
  });

  it("boundary: empty rewards array", () => {
    expect(storedHuntSchema.safeParse({ ...validHunt, rewards: [] }).success).toBe(true);
  });

  it("boundary: rewards with invalid shape are rejected", () => {
    expect(storedHuntSchema.safeParse({ ...validHunt, rewards: [{ place: 1 }] }).success).toBe(
      false
    );
    expect(storedHuntSchema.safeParse({ ...validHunt, rewards: ["not a reward"] }).success).toBe(
      false
    );
  });

  it("boundary: very large id", () => {
    expect(storedHuntSchema.safeParse({ ...validHunt, id: Number.MAX_SAFE_INTEGER }).success).toBe(
      true
    );
  });

  it("boundary: negative id", () => {
    expect(storedHuntSchema.safeParse({ ...validHunt, id: -1 }).success).toBe(true);
  });
});

// ── playerProgressSchema ──────────────────────────────────────────────────

describe("playerProgressSchema", () => {
  const validProgress = {
    hunt_id: 1,
    player: "GABC1234567890DEF",
    current_clue_index: 0,
    completed: false,
    reward_claimed: false,
  };

  it("accepts a valid progress record", () => {
    const result = playerProgressSchema.parse(validProgress);
    expect(result.player).toBe("GABC1234567890DEF");
  });

  it("accepts completed and claimed state", () => {
    expect(
      playerProgressSchema.safeParse({ ...validProgress, completed: true, reward_claimed: true })
        .success
    ).toBe(true);
  });

  it("accepts high clue index", () => {
    expect(
      playerProgressSchema.safeParse({ ...validProgress, current_clue_index: 999 }).success
    ).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(
      playerProgressSchema.safeParse({
        hunt_id: 1,
        player: "P",
        completed: false,
        reward_claimed: false,
      }).success
    ).toBe(false);
    expect(
      playerProgressSchema.safeParse({
        hunt_id: 1,
        player: "P",
        current_clue_index: 0,
        reward_claimed: false,
      }).success
    ).toBe(false);
    expect(
      playerProgressSchema.safeParse({
        hunt_id: 1,
        player: "P",
        current_clue_index: 0,
        completed: false,
      }).success
    ).toBe(false);
    expect(
      playerProgressSchema.safeParse({
        player: "P",
        current_clue_index: 0,
        completed: false,
        reward_claimed: false,
      }).success
    ).toBe(false);
    expect(
      playerProgressSchema.safeParse({
        hunt_id: 1,
        current_clue_index: 0,
        completed: false,
        reward_claimed: false,
      }).success
    ).toBe(false);
  });

  it("rejects wrong types", () => {
    expect(playerProgressSchema.safeParse({ ...validProgress, hunt_id: "1" }).success).toBe(false);
    expect(playerProgressSchema.safeParse({ ...validProgress, player: 123 }).success).toBe(false);
    expect(
      playerProgressSchema.safeParse({ ...validProgress, current_clue_index: "0" }).success
    ).toBe(false);
    expect(playerProgressSchema.safeParse({ ...validProgress, completed: "false" }).success).toBe(
      false
    );
    expect(playerProgressSchema.safeParse({ ...validProgress, reward_claimed: 0 }).success).toBe(
      false
    );
  });

  it("rejects non-objects", () => {
    expect(playerProgressSchema.safeParse(null).success).toBe(false);
    expect(playerProgressSchema.safeParse(undefined).success).toBe(false);
    expect(playerProgressSchema.safeParse([]).success).toBe(false);
    expect(playerProgressSchema.safeParse("string").success).toBe(false);
  });

  it("boundary: empty player string", () => {
    expect(playerProgressSchema.safeParse({ ...validProgress, player: "" }).success).toBe(true);
  });

  it("boundary: negative clue index", () => {
    expect(
      playerProgressSchema.safeParse({ ...validProgress, current_clue_index: -1 }).success
    ).toBe(true);
  });
});

// ── achievementIdSchema ───────────────────────────────────────────────────

describe("achievementIdSchema", () => {
  const validIds = [
    "first_hunt_completed",
    "first_win",
    "five_wins",
    "ten_wins",
    "twenty_five_wins",
    "first_nft",
    "high_scorer",
    "speed_hunter",
    "veteran",
    "legend",
  ];

  it("accepts all valid achievement IDs", () => {
    for (const id of validIds) {
      expect(achievementIdSchema.safeParse(id).success).toBe(true);
    }
  });

  it("rejects invalid achievement IDs", () => {
    expect(achievementIdSchema.safeParse("first_win").success).toBe(true);
    expect(achievementIdSchema.safeParse("hundred_wins").success).toBe(false);
    expect(achievementIdSchema.safeParse("FIRST_WIN").success).toBe(false);
    expect(achievementIdSchema.safeParse("").success).toBe(false);
    expect(achievementIdSchema.safeParse(null).success).toBe(false);
    expect(achievementIdSchema.safeParse(undefined).success).toBe(false);
    expect(achievementIdSchema.safeParse(123).success).toBe(false);
  });
});

// ── achievementSchema ─────────────────────────────────────────────────────

describe("achievementSchema", () => {
  const validAchievement = {
    id: "first_win" as const,
    title: "Victory Lap",
    description: "Win your first hunt",
    icon: "🏆",
    rarity: "common" as const,
    condition: "Win 1 hunt",
  };

  it("accepts a valid achievement", () => {
    const result = achievementSchema.parse(validAchievement);
    expect(result.id).toBe("first_win");
    expect(result.rarity).toBe("common");
  });

  it("accepts all rarity values", () => {
    for (const rarity of ["common", "uncommon", "rare", "epic", "legendary"]) {
      expect(achievementSchema.safeParse({ ...validAchievement, rarity }).success).toBe(true);
    }
  });

  it("accepts all achievement IDs", () => {
    const ids = [
      "first_hunt_completed",
      "first_win",
      "five_wins",
      "ten_wins",
      "twenty_five_wins",
      "first_nft",
      "high_scorer",
      "speed_hunter",
      "veteran",
      "legend",
    ];
    for (const id of ids) {
      expect(achievementSchema.safeParse({ ...validAchievement, id }).success).toBe(true);
    }
  });

  it("rejects invalid achievement ID", () => {
    expect(achievementSchema.safeParse({ ...validAchievement, id: "hundred_wins" }).success).toBe(
      false
    );
  });

  it("rejects invalid rarity", () => {
    expect(achievementSchema.safeParse({ ...validAchievement, rarity: "mythic" }).success).toBe(
      false
    );
    expect(achievementSchema.safeParse({ ...validAchievement, rarity: "Common" }).success).toBe(
      false
    );
  });

  it("rejects missing required fields", () => {
    expect(
      achievementSchema.safeParse({
        title: "T",
        description: "D",
        icon: "I",
        rarity: "common",
        condition: "C",
      }).success
    ).toBe(false);
    expect(
      achievementSchema.safeParse({
        id: "first_win",
        description: "D",
        icon: "I",
        rarity: "common",
        condition: "C",
      }).success
    ).toBe(false);
    expect(
      achievementSchema.safeParse({
        id: "first_win",
        title: "T",
        icon: "I",
        rarity: "common",
        condition: "C",
      }).success
    ).toBe(false);
    expect(
      achievementSchema.safeParse({
        id: "first_win",
        title: "T",
        description: "D",
        rarity: "common",
        condition: "C",
      }).success
    ).toBe(false);
    expect(
      achievementSchema.safeParse({
        id: "first_win",
        title: "T",
        description: "D",
        icon: "I",
        condition: "C",
      }).success
    ).toBe(false);
    expect(
      achievementSchema.safeParse({
        id: "first_win",
        title: "T",
        description: "D",
        icon: "I",
        rarity: "common",
      }).success
    ).toBe(false);
  });

  it("rejects wrong types", () => {
    expect(achievementSchema.safeParse({ ...validAchievement, id: 123 }).success).toBe(false);
    expect(achievementSchema.safeParse({ ...validAchievement, title: 123 }).success).toBe(false);
    expect(achievementSchema.safeParse({ ...validAchievement, description: 123 }).success).toBe(
      false
    );
    expect(achievementSchema.safeParse({ ...validAchievement, icon: 123 }).success).toBe(false);
    expect(achievementSchema.safeParse({ ...validAchievement, rarity: 123 }).success).toBe(false);
    expect(achievementSchema.safeParse({ ...validAchievement, condition: 123 }).success).toBe(
      false
    );
  });

  it("rejects non-objects", () => {
    expect(achievementSchema.safeParse(null).success).toBe(false);
    expect(achievementSchema.safeParse(undefined).success).toBe(false);
    expect(achievementSchema.safeParse([]).success).toBe(false);
    expect(achievementSchema.safeParse("string").success).toBe(false);
  });

  it("boundary: empty strings for text fields", () => {
    expect(achievementSchema.safeParse({ ...validAchievement, title: "" }).success).toBe(true);
    expect(achievementSchema.safeParse({ ...validAchievement, description: "" }).success).toBe(
      true
    );
    expect(achievementSchema.safeParse({ ...validAchievement, icon: "" }).success).toBe(true);
    expect(achievementSchema.safeParse({ ...validAchievement, condition: "" }).success).toBe(true);
  });
});

// ── schemas map ───────────────────────────────────────────────────────────

describe("schemas convenience map", () => {
  it("contains all expected keys", () => {
    expect(Object.keys(schemas).sort()).toEqual([
      "achievement",
      "clue",
      "playerProgress",
      "reward",
      "storedHunt",
    ]);
  });

  it("each entry is a valid Zod schema", () => {
    for (const [_key, schema] of Object.entries(schemas)) {
      expect(typeof schema.parse).toBe("function");
      expect(typeof schema.safeParse).toBe("function");
    }
  });

  it("reward schema in map matches standalone", () => {
    expect(schemas.reward).toBe(rewardSchema);
  });

  it("clue schema in map matches standalone", () => {
    expect(schemas.clue).toBe(clueSchema);
  });

  it("storedHunt schema in map matches standalone", () => {
    expect(schemas.storedHunt).toBe(storedHuntSchema);
  });

  it("playerProgress schema in map matches standalone", () => {
    expect(schemas.playerProgress).toBe(playerProgressSchema);
  });

  it("achievement schema in map matches standalone", () => {
    expect(schemas.achievement).toBe(achievementSchema);
  });
});

// ── storedHuntSchema — #1173 gracePeriodSeconds ───────────────────────────

describe("storedHuntSchema — gracePeriodSeconds (#1173)", () => {
  const base = {
    id: 1,
    title: "Test Hunt",
    description: "Desc",
    cluesCount: 3,
    status: "Active",
    rewardType: "XLM",
  };

  it("accepts a hunt without gracePeriodSeconds (optional field)", () => {
    expect(storedHuntSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a valid gracePeriodSeconds value", () => {
    expect(storedHuntSchema.safeParse({ ...base, gracePeriodSeconds: 604800 }).success).toBe(true);
  });

  it("accepts gracePeriodSeconds of 0 (immediate refund allowed once expired)", () => {
    expect(storedHuntSchema.safeParse({ ...base, gracePeriodSeconds: 0 }).success).toBe(true);
  });

  it("rejects negative gracePeriodSeconds", () => {
    expect(storedHuntSchema.safeParse({ ...base, gracePeriodSeconds: -1 }).success).toBe(false);
  });

  it("rejects non-integer gracePeriodSeconds", () => {
    expect(storedHuntSchema.safeParse({ ...base, gracePeriodSeconds: 3.14 }).success).toBe(false);
  });

  it("rejects string gracePeriodSeconds", () => {
    expect(storedHuntSchema.safeParse({ ...base, gracePeriodSeconds: "604800" }).success).toBe(
      false
    );
  });
});

// ── storedHuntSchema — #1175 sponsors ────────────────────────────────────

describe("storedHuntSchema — sponsors (#1175)", () => {
  const base = {
    id: 1,
    title: "Sponsored Hunt",
    description: "Desc",
    cluesCount: 3,
    status: "Active",
    rewardType: "XLM",
  };

  it("accepts a hunt without sponsors (optional field)", () => {
    expect(storedHuntSchema.safeParse(base).success).toBe(true);
  });

  it("accepts an empty sponsors array", () => {
    expect(storedHuntSchema.safeParse({ ...base, sponsors: [] }).success).toBe(true);
  });

  it("accepts a populated sponsors array of strings", () => {
    expect(
      storedHuntSchema.safeParse({
        ...base,
        sponsors: [
          "GSPONSOR1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
          "GSPONSOR2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        ],
      }).success
    ).toBe(true);
  });

  it("rejects sponsors that is not an array", () => {
    expect(storedHuntSchema.safeParse({ ...base, sponsors: "GSPONSOR1" }).success).toBe(false);
  });

  it("rejects a sponsors array containing non-strings", () => {
    expect(storedHuntSchema.safeParse({ ...base, sponsors: [1, 2] }).success).toBe(false);
  });
});

// ── huntRefundBodySchema (#1173) ──────────────────────────────────────────

import { huntRefundBodySchema, huntSponsorBodySchema } from "../src/api-schemas";

describe("huntRefundBodySchema (#1173)", () => {
  it("accepts a valid creatorAddress", () => {
    expect(
      huntRefundBodySchema.safeParse({
        creatorAddress: "GCREATOR2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      }).success
    ).toBe(true);
  });

  it("rejects an empty creatorAddress", () => {
    expect(huntRefundBodySchema.safeParse({ creatorAddress: "" }).success).toBe(false);
  });

  it("rejects a missing creatorAddress", () => {
    expect(huntRefundBodySchema.safeParse({}).success).toBe(false);
  });
});

// ── huntSponsorBodySchema (#1175) ─────────────────────────────────────────

describe("huntSponsorBodySchema (#1175)", () => {
  const valid = {
    sponsorAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    amount: 100,
  };

  it("accepts a valid sponsor address and positive amount", () => {
    expect(huntSponsorBodySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a non-Stellar sponsorAddress", () => {
    expect(
      huntSponsorBodySchema.safeParse({ ...valid, sponsorAddress: "not-a-stellar-address" }).success
    ).toBe(false);
  });

  it("rejects a zero amount", () => {
    expect(huntSponsorBodySchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
  });

  it("rejects a negative amount", () => {
    expect(huntSponsorBodySchema.safeParse({ ...valid, amount: -50 }).success).toBe(false);
  });

  it("rejects a missing amount", () => {
    expect(huntSponsorBodySchema.safeParse({ sponsorAddress: valid.sponsorAddress }).success).toBe(
      false
    );
  });

  it("rejects a missing sponsorAddress", () => {
    expect(huntSponsorBodySchema.safeParse({ amount: 100 }).success).toBe(false);
  });

  it("rejects a string amount", () => {
    expect(huntSponsorBodySchema.safeParse({ ...valid, amount: "100" }).success).toBe(false);
  });
});
