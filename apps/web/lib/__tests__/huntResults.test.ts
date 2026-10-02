import { describe, expect, it } from "vitest";

import {
  buildHuntResultsSummary,
  getPlayerHuntResult,
  HUNT_RESULTS_LEADERBOARD_LIMIT,
} from "@/lib/huntResults";
import type { StoredProgressEntry } from "@/lib/progressData";

function makeEntry(overrides: Partial<StoredProgressEntry> = {}): StoredProgressEntry {
  return {
    huntId: 1,
    wallet: "GABC...WALLET",
    currentClueIndex: 0,
    totalClues: 5,
    totalPoints: 0,
    completed: false,
    completedAt: null,
    startedAt: 0,
    lastUpdated: 0,
    completedClueIds: [],
    ...overrides,
  };
}

describe("getPlayerHuntResult", () => {
  it("returns the player's rank by points and completion time", () => {
    const entries = [
      makeEntry({ wallet: "GABC...WALLET", totalPoints: 20, completed: true, startedAt: 1_000_000, completedAt: 1_006_000 }),
      makeEntry({ wallet: "GABC...WINNER", totalPoints: 90, completed: true }),
    ];

    const result = getPlayerHuntResult(entries, "GABC...WALLET");

    expect(result.rank).toBe(2);
    expect(result.completionTimeSeconds).toBe(6);
  });

  it("ranks by points descending, matching the results-page leaderboard", () => {
    const entries = [
      makeEntry({ wallet: "first", totalPoints: 40, completed: true }),
      makeEntry({ wallet: "second", totalPoints: 10, completed: true }),
      makeEntry({ wallet: "third", totalPoints: 5, completed: true }),
    ];

    expect(getPlayerHuntResult(entries, "second").rank).toBe(2);
    expect(getPlayerHuntResult(entries, "third").rank).toBe(3);
  });

  it("matches wallets case-insensitively", () => {
    const entries = [makeEntry({ wallet: "GABCupper", totalPoints: 10, completed: true })];

    expect(getPlayerHuntResult(entries, "gabcUPPER").rank).toBe(1);
  });

  it("returns null rank when the wallet is absent from the ranked board", () => {
    const entries = [makeEntry({ wallet: "someone-else", totalPoints: 10, completed: true })];

    expect(getPlayerHuntResult(entries, "nobody").rank).toBeNull();
  });

  it("returns null completion time when the player never completed", () => {
    const entries = [makeEntry({ wallet: "abc", totalPoints: 10, completed: false, completedAt: null })];

    expect(getPlayerHuntResult(entries, "abc").completionTimeSeconds).toBeNull();
  });

  it("excludes non-scoring, non-finishing players from the rank but still resolves rank as null", () => {
    const entries = [makeEntry({ wallet: "ghost", totalPoints: 0, completed: false })];

    expect(getPlayerHuntResult(entries, "ghost").rank).toBeNull();
  });
});

describe("buildHuntResultsSummary", () => {
  it("ranks entries by points, highest first", () => {
    const entries = [
      makeEntry({ wallet: "low", totalPoints: 20, completed: true }),
      makeEntry({ wallet: "high", totalPoints: 90, completed: true }),
      makeEntry({ wallet: "mid", totalPoints: 50, completed: true }),
    ];

    const summary = buildHuntResultsSummary({ playerCount: 3, rewardDistribution: [] }, entries);

    expect(summary.leaderboard.map((e) => e.wallet)).toEqual(["high", "mid", "low"]);
    expect(summary.leaderboard.map((e) => e.position)).toEqual([1, 2, 3]);
    expect(summary.topEntry?.wallet).toBe("high");
  });

  it("caps the leaderboard at the configured limit", () => {
    const entries = Array.from({ length: HUNT_RESULTS_LEADERBOARD_LIMIT + 5 }, (_, i) =>
      makeEntry({ wallet: `player-${i}`, totalPoints: i + 1, completed: true })
    );

    const summary = buildHuntResultsSummary({ playerCount: entries.length, rewardDistribution: [] }, entries);

    expect(summary.leaderboard).toHaveLength(HUNT_RESULTS_LEADERBOARD_LIMIT);
    expect(summary.leaderboard[0].wallet).toBe(`player-${entries.length - 1}`);
  });

  it("excludes players with zero points who never completed the hunt", () => {
    const entries = [
      makeEntry({ wallet: "ghost", totalPoints: 0, completed: false }),
      makeEntry({ wallet: "finisher", totalPoints: 0, completed: true }),
      makeEntry({ wallet: "scorer", totalPoints: 10, completed: false }),
    ];

    const summary = buildHuntResultsSummary({ playerCount: 3, rewardDistribution: [] }, entries);

    expect(summary.leaderboard.map((e) => e.wallet).sort()).toEqual(["finisher", "scorer"]);
  });

  it("counts completions independently of the leaderboard cap", () => {
    const entries = [
      makeEntry({ wallet: "a", totalPoints: 10, completed: true }),
      makeEntry({ wallet: "b", totalPoints: 5, completed: true }),
      makeEntry({ wallet: "c", totalPoints: 1, completed: false }),
    ];

    const summary = buildHuntResultsSummary({ playerCount: 3, rewardDistribution: [] }, entries);

    expect(summary.totalCompletions).toBe(2);
  });

  it("uses the larger of the stored player count snapshot and recorded entries", () => {
    const entries = [makeEntry({ wallet: "a", totalPoints: 10, completed: true })];

    const fromSnapshot = buildHuntResultsSummary({ playerCount: 40, rewardDistribution: [] }, entries);
    expect(fromSnapshot.totalPlayers).toBe(40);

    const fromEntries = buildHuntResultsSummary({ playerCount: 0, rewardDistribution: [] }, entries);
    expect(fromEntries.totalPlayers).toBe(1);
  });

  it("returns an empty leaderboard and null top entry when nobody played", () => {
    const summary = buildHuntResultsSummary({ playerCount: 0, rewardDistribution: [] }, []);

    expect(summary.leaderboard).toEqual([]);
    expect(summary.topEntry).toBeNull();
    expect(summary.totalCompletions).toBe(0);
  });

  it("passes through the hunt's reward distribution", () => {
    const distribution = [
      { place: 1, amount: 100 },
      { place: 2, amount: 50 },
    ];

    const summary = buildHuntResultsSummary({ playerCount: 0, rewardDistribution: distribution }, []);

    expect(summary.rewardDistribution).toEqual(distribution);
  });
});
