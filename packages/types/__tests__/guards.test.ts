import { describe, expect, it } from "vitest"

import {
  assertAchievement,
  assertClue,
  assertPlayerProgress,
  assertReward,
  assertStoredHunt,
  isAchievement,
  isAchievementId,
  isClue,
  isHuntStatus,
  isPlayerProgress,
  isReward,
  isRewardType,
  isStoredHunt,
  type Achievement,
  type Clue,
  type PlayerProgress,
  type Reward,
  type StoredHunt,
} from "../src/index"

const validReward: Reward = { place: 1, amount: 10 }

const validClue: Clue = {
  id: 1,
  huntId: 2,
  question: "Where?",
  answer: "here",
  points: 5,
}

const validHunt: StoredHunt = {
  id: 1,
  title: "City Hunt",
  description: "A hunt",
  cluesCount: 3,
  status: "Active",
  rewardType: "XLM",
  rewards: [validReward],
}

const validProgress: PlayerProgress = {
  hunt_id: 1,
  player: "GABC",
  current_clue_index: 0,
  completed: false,
  reward_claimed: false,
}

const validAchievement: Achievement = {
  id: "first_win",
  title: "Victory Lap",
  description: "Win your first hunt",
  icon: "🏆",
  rarity: "common",
  condition: "Win 1 hunt",
}

describe("enum guards", () => {
  it("recognises valid hunt statuses and reward types", () => {
    for (const status of [
      "Active", "Completed", "Draft", "Cancelled",
      "PendingReview", "Scheduled", "Ended",
    ]) {
      expect(isHuntStatus(status)).toBe(true)
    }
    expect(isHuntStatus("active")).toBe(false)
    expect(isHuntStatus("Paused")).toBe(false)
    expect(isHuntStatus("")).toBe(false)
    expect(isHuntStatus(null)).toBe(false)
    expect(isRewardType("Both")).toBe(true)
    expect(isRewardType("DOGE")).toBe(false)
    expect(isAchievementId("legend")).toBe(true)
    expect(isAchievementId("nope")).toBe(false)
  })
})

describe("shape guards", () => {
  it("accepts valid domain objects", () => {
    expect(isReward(validReward)).toBe(true)
    expect(isClue(validClue)).toBe(true)
    expect(isStoredHunt(validHunt)).toBe(true)
    expect(isPlayerProgress(validProgress)).toBe(true)
    expect(isAchievement(validAchievement)).toBe(true)
  })

  it("rejects malformed objects and non-objects", () => {
    expect(isReward({ place: 1 })).toBe(false)
    expect(isClue({ ...validClue, answer: 42 })).toBe(false)
    expect(isStoredHunt({ ...validHunt, status: "Paused" })).toBe(false)
    expect(isStoredHunt({ ...validHunt, rewards: [{ place: 1 }] })).toBe(false)
    expect(isPlayerProgress(null)).toBe(false)
    expect(isAchievement({ ...validAchievement, rarity: "mythic" })).toBe(false)
    expect(isReward("nope")).toBe(false)
  })
})

describe("assertion functions", () => {
  it("pass through valid values", () => {
    expect(() => assertStoredHunt(validHunt)).not.toThrow()
    expect(() => assertClue(validClue)).not.toThrow()
    expect(() => assertReward(validReward)).not.toThrow()
    expect(() => assertPlayerProgress(validProgress)).not.toThrow()
    expect(() => assertAchievement(validAchievement)).not.toThrow()
  })

  it("throw a TypeError describing what was received", () => {
    expect(() => assertStoredHunt(null)).toThrow(TypeError)
    expect(() => assertClue([])).toThrow(/received array/)
    expect(() => assertReward(undefined)).toThrow(/Expected Reward/)
  })
})
