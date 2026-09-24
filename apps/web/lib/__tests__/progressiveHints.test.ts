import { describe, expect, it } from "vitest";

import {
  applyHintCost,
  canAffordHint,
  createHintUsage,
  getHintCost,
  getNextHintLevel,
} from "../progressiveHints";

describe("progressive hints", () => {
  const hints = [
    {
      level: 1,
      text: "Look near the entrance.",
      cost: 5,
    },
    {
      level: 2,
      text: "Check the area beside the main building.",
      cost: 10,
    },
    {
      level: 3,
      text: "The answer is close to the large sign.",
      cost: 15,
    },
  ];

  it("unlocks the first hint when no hints have been used", () => {
    expect(getNextHintLevel([], hints)).toBe(1);
  });

  it("unlocks the second hint after the first hint is used", () => {
    expect(getNextHintLevel([1], hints)).toBe(2);
  });

  it("unlocks the third hint after the first two hints are used", () => {
    expect(getNextHintLevel([1, 2], hints)).toBe(3);
  });

  it("returns null when all hints have been used", () => {
    expect(getNextHintLevel([1, 2, 3], hints)).toBeNull();
  });

  it("calculates escalating hint costs", () => {
    expect(getHintCost(1)).toBe(5);
    expect(getHintCost(2)).toBe(10);
    expect(getHintCost(3)).toBe(15);
  });

  it("does not allow a player to use a hint they cannot afford", () => {
    expect(canAffordHint(4, 5)).toBe(false);
    expect(canAffordHint(5, 5)).toBe(true);
  });

  it("deducts the hint cost from the player's score", () => {
    expect(applyHintCost(100, 5)).toBe(95);
    expect(applyHintCost(100, 10)).toBe(90);
  });

  it("does not allow the score to become negative", () => {
    expect(applyHintCost(3, 5)).toBe(0);
  });

  it("creates a hint usage analytics record", () => {
    const usage = createHintUsage(42, 2, 10);

    expect(usage).toMatchObject({
      clueId: 42,
      hintLevel: 2,
      cost: 10,
    });

    expect(typeof usage.usedAt).toBe("number");
  });
});
