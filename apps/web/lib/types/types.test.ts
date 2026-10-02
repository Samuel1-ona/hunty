import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type ActivityEvent,
  type ChatMessage,
  type Clue,
  type HuntAttemptRecord,
  type HuntCard,
  type HuntInvite,
  type LeaderboardEntry,
  type PerformanceMetric,
  PLAYER_COUNT_CACHE_TTL_MS,
  type PlayerProfile,
  type Reward,
  type Season,
  type StoredHunt,
  TRENDING_PLAYER_THRESHOLD,
  type WaitlistEntry,
} from "../types";

type PublicTypeSamples = [
  ActivityEvent,
  ChatMessage,
  Clue,
  HuntAttemptRecord,
  HuntCard,
  HuntInvite,
  LeaderboardEntry,
  PerformanceMetric,
  PlayerProfile,
  Reward,
  Season,
  StoredHunt,
  WaitlistEntry,
];

describe("types compatibility barrel", () => {
  it("keeps representative types from every responsibility importable", () => {
    expectTypeOf<PublicTypeSamples>().toBeArray();
  });

  it("preserves the legacy player-count constants", () => {
    expect(TRENDING_PLAYER_THRESHOLD).toBe(50);
    expect(PLAYER_COUNT_CACHE_TTL_MS).toBe(60_000);
  });
});
