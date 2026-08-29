import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock progressData before importing computeDifficulty
vi.mock("@/lib/progressData", () => ({
  getAllProgressForHunt: vi.fn(),
}));

import { getAllProgressForHunt } from "@/lib/progressData";
import { computeDifficulty, MIN_SAMPLES } from "../computeDifficulty";
import type { StoredProgressEntry } from "@/lib/progressData";

const mockGetAll = vi.mocked(getAllProgressForHunt);

/** Helper: build a minimal StoredProgressEntry. */
function makeEntry(
  overrides: Partial<StoredProgressEntry> = {},
): StoredProgressEntry {
  return {
    huntId: 1,
    wallet: "G" + "A".repeat(55),
    currentClueIndex: 5,
    totalClues: 5,
    totalPoints: 100,
    completed: true,
    completedAt: 1_000_000 + 20 * 60_000, // 20 min solve
    startedAt: 1_000_000,
    lastUpdated: 1_000_000 + 20 * 60_000,
    completedClueIds: [],
    ...overrides,
  };
}

describe("computeDifficulty", () => {
  beforeEach(() => {
    mockGetAll.mockReset();
  });

  it("returns provisional Medium when there are no attempts", () => {
    mockGetAll.mockReturnValue([]);

    const result = computeDifficulty(1);

    expect(result.label).toBe("Medium");
    expect(result.completionRate).toBeNull();
    expect(result.avgSolveTimeMs).toBeNull();
    expect(result.totalAttempts).toBe(0);
    expect(result.totalCompletions).toBe(0);
    expect(result.reliable).toBe(false);
  });

  it("marks result as reliable once MIN_SAMPLES attempts exist", () => {
    mockGetAll.mockReturnValue(
      Array.from({ length: MIN_SAMPLES }, () => makeEntry()),
    );

    const result = computeDifficulty(1);
    expect(result.reliable).toBe(true);
  });

  it("marks result as unreliable below MIN_SAMPLES", () => {
    mockGetAll.mockReturnValue([makeEntry()]);
    expect(computeDifficulty(1).reliable).toBe(false);
  });

  describe("completion-rate tiers", () => {
    it("labels Easy when ≥70% complete", () => {
      // 7 completions, 10 attempts → 70 %
      const entries = [
        ...Array.from({ length: 7 }, () =>
          makeEntry({ completed: true, completedAt: 1_000_000 + 5 * 60_000 }),
        ),
        ...Array.from({ length: 3 }, () =>
          makeEntry({ completed: false, completedAt: null }),
        ),
      ];
      mockGetAll.mockReturnValue(entries);
      expect(computeDifficulty(1).label).toBe("Easy");
    });

    it("labels Medium when 40–69% complete", () => {
      const entries = [
        ...Array.from({ length: 5 }, () =>
          makeEntry({ completed: true, completedAt: 1_000_000 + 5 * 60_000 }),
        ),
        ...Array.from({ length: 5 }, () =>
          makeEntry({ completed: false, completedAt: null }),
        ),
      ];
      mockGetAll.mockReturnValue(entries);
      expect(computeDifficulty(1).label).toBe("Medium");
    });

    it("labels Hard when 15–39% complete", () => {
      const entries = [
        makeEntry({ completed: true, completedAt: 1_000_000 + 5 * 60_000 }),
        ...Array.from({ length: 5 }, () =>
          makeEntry({ completed: false, completedAt: null }),
        ),
      ];
      mockGetAll.mockReturnValue(entries);
      // 1/6 ≈ 16.7% → Hard (solve time 5 min → Easy, but completion rate wins)
      expect(computeDifficulty(1).label).toBe("Hard");
    });

    it("labels Expert when <15% complete", () => {
      const entries = [
        makeEntry({ completed: true, completedAt: 1_000_000 + 5 * 60_000 }),
        ...Array.from({ length: 9 }, () =>
          makeEntry({ completed: false, completedAt: null }),
        ),
      ];
      mockGetAll.mockReturnValue(entries);
      // 1/10 = 10% → Expert
      expect(computeDifficulty(1).label).toBe("Expert");
    });
  });

  describe("solve-time tiers", () => {
    it("escalates to Expert when avg solve time ≥90 min even if completion rate is high", () => {
      // All 10 players completed with a 2-hour solve time
      const entries = Array.from({ length: 10 }, () =>
        makeEntry({
          completed: true,
          startedAt: 1_000_000,
          completedAt: 1_000_000 + 120 * 60_000, // 120 min
        }),
      );
      mockGetAll.mockReturnValue(entries);
      expect(computeDifficulty(1).label).toBe("Expert");
    });

    it("escalates to Hard when avg solve time 30–89 min even with high completion rate", () => {
      const entries = Array.from({ length: 10 }, () =>
        makeEntry({
          completed: true,
          startedAt: 1_000_000,
          completedAt: 1_000_000 + 45 * 60_000, // 45 min
        }),
      );
      mockGetAll.mockReturnValue(entries);
      expect(computeDifficulty(1).label).toBe("Hard");
    });

    it("stays Easy when both completion rate and solve time are favourable", () => {
      const entries = Array.from({ length: 10 }, () =>
        makeEntry({
          completed: true,
          startedAt: 1_000_000,
          completedAt: 1_000_000 + 5 * 60_000, // 5 min
        }),
      );
      mockGetAll.mockReturnValue(entries);
      expect(computeDifficulty(1).label).toBe("Easy");
    });
  });

  it("returns correct statistics", () => {
    const entries = [
      makeEntry({
        completed: true,
        startedAt: 1_000_000,
        completedAt: 1_000_000 + 20 * 60_000,
      }),
      makeEntry({
        completed: true,
        startedAt: 1_000_000,
        completedAt: 1_000_000 + 40 * 60_000,
      }),
      makeEntry({ completed: false, completedAt: null }),
    ];
    mockGetAll.mockReturnValue(entries);

    const result = computeDifficulty(1);

    expect(result.huntId).toBe(1);
    expect(result.totalAttempts).toBe(3);
    expect(result.totalCompletions).toBe(2);
    expect(result.completionRate).toBeCloseTo(2 / 3);
    // avg solve = (20 + 40) / 2 = 30 min — just hitting the Hard threshold
    expect(result.avgSolveTimeMs).toBeCloseTo(30 * 60_000);
  });

  it("includes the huntId passed in", () => {
    mockGetAll.mockReturnValue([]);
    expect(computeDifficulty(42).huntId).toBe(42);
  });
});
