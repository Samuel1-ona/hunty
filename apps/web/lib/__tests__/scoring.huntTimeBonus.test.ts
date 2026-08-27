import { describe, expect, it } from "vitest";

import { calculateHuntTimeBonus, HUNT_TIME_BONUS_CONFIG } from "@/lib/scoring";

const { maxBonus, benchmarkSeconds } = HUNT_TIME_BONUS_CONFIG;

describe("HUNT_TIME_BONUS_CONFIG", () => {
  it("exports a maxBonus of 500", () => {
    expect(maxBonus).toBe(500);
  });

  it("exports a benchmarkSeconds of 3600", () => {
    expect(benchmarkSeconds).toBe(3600);
  });
});

describe("calculateHuntTimeBonus", () => {
  // ── boundary conditions ───────────────────────────────────────────────

  it("returns maxBonus for a zero-second completion", () => {
    expect(calculateHuntTimeBonus(0)).toBe(maxBonus);
  });

  it("returns maxBonus for a negative completion time (guard against bad data)", () => {
    expect(calculateHuntTimeBonus(-10)).toBe(maxBonus);
  });

  it("returns 0 at exactly the benchmark", () => {
    expect(calculateHuntTimeBonus(benchmarkSeconds)).toBe(0);
  });

  it("returns 0 for completions slower than the benchmark", () => {
    expect(calculateHuntTimeBonus(benchmarkSeconds + 1)).toBe(0);
    expect(calculateHuntTimeBonus(benchmarkSeconds * 2)).toBe(0);
  });

  // ── linear decay ─────────────────────────────────────────────────────

  it("returns exactly half of maxBonus at half the benchmark", () => {
    // floor(500 × (1 - 0.5)) = floor(250) = 250
    expect(calculateHuntTimeBonus(benchmarkSeconds / 2)).toBe(250);
  });

  it("returns ~75% of maxBonus at 25% of the benchmark", () => {
    // floor(500 × 0.75) = 375
    expect(calculateHuntTimeBonus(benchmarkSeconds * 0.25)).toBe(375);
  });

  it("returns ~25% of maxBonus at 75% of the benchmark", () => {
    // floor(500 × 0.25) = 125
    expect(calculateHuntTimeBonus(benchmarkSeconds * 0.75)).toBe(125);
  });

  // ── floor behaviour ───────────────────────────────────────────────────

  it("uses floor (not round) so fractional points are truncated", () => {
    // 1 second → 500 × (1 − 1/3600) ≈ 499.861... → floor → 499
    expect(calculateHuntTimeBonus(1)).toBe(499);
  });

  // ── custom parameters ────────────────────────────────────────────────

  it("respects a custom maxBonus", () => {
    expect(calculateHuntTimeBonus(0, 1000)).toBe(1000);
    expect(calculateHuntTimeBonus(1800, 1000)).toBe(500); // 50% through 3600s benchmark
  });

  it("respects a custom benchmarkSeconds", () => {
    // With a 600s benchmark, finishing at 300s → floor(500 × 0.5) = 250
    expect(calculateHuntTimeBonus(300, maxBonus, 600)).toBe(250);
    // At 600s (= benchmark) → 0
    expect(calculateHuntTimeBonus(600, maxBonus, 600)).toBe(0);
  });

  it("returns maxBonus when custom benchmarkSeconds is 0 and time is 0", () => {
    // Edge: degenerate benchmark — still returns maxBonus for t=0 via early return
    expect(calculateHuntTimeBonus(0, 200, 0)).toBe(200);
  });

  // ── monotonicity ──────────────────────────────────────────────────────

  it("produces a strictly decreasing (non-increasing) bonus as completion time grows", () => {
    const times = [0, 300, 600, 900, 1200, 1800, 2700, 3600];
    const bonuses = times.map((t) => calculateHuntTimeBonus(t));
    for (let i = 1; i < bonuses.length; i++) {
      expect(bonuses[i]).toBeLessThanOrEqual(bonuses[i - 1]);
    }
  });

  // ── return type ───────────────────────────────────────────────────────

  it("always returns an integer", () => {
    const testTimes = [0, 1, 13, 100, 999, 1800, 3599, 3600, 7200];
    for (const t of testTimes) {
      const bonus = calculateHuntTimeBonus(t);
      expect(Number.isInteger(bonus)).toBe(true);
    }
  });
});
