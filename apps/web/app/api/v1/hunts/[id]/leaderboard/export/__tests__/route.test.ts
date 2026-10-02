/**
 * Tests for the hunt leaderboard export endpoint
 *
 * GET /api/v1/hunts/[id]/leaderboard/export
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockRateLimit = vi.fn();
const mockGetHuntLeaderboard = vi.fn();
const mockGetHuntFastestPlayers = vi.fn();

vi.mock("@/lib/contracts/hunt", () => ({
  get_hunt_leaderboard: (...args: unknown[]) => mockGetHuntLeaderboard(...args),
  get_hunt_fastest_players: (...args: unknown[]) => mockGetHuntFastestPlayers(...args),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return {
    ...actual,
    getIP: () => "127.0.0.1",
    rateLimit: (...args: unknown[]) => mockRateLimit(...args),
  };
});

async function loadRoute() {
  vi.resetModules();
  return import("../route");
}

function createRequest(huntId: string | number) {
  return new Request(`http://localhost/api/v1/hunts/${huntId}/leaderboard/export`, {
    method: "GET",
  });
}

const mockLeaderboard = [
  { address: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", points: 300 },
  { address: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", points: 200 },
] as any;

describe("GET /api/v1/hunts/[id]/leaderboard/export", () => {
  beforeEach(() => {
    mockRateLimit.mockReset();
    mockGetHuntLeaderboard.mockReset();
    mockGetHuntFastestPlayers.mockReset();
    mockGetHuntLeaderboard.mockResolvedValue(mockLeaderboard);
    mockGetHuntFastestPlayers.mockResolvedValue([]);
  });

  it("returns 200 with CSV on the first request instead of a spurious 429", async () => {
    mockRateLimit.mockResolvedValue({
      success: true,
      remaining: 29,
      reset: Date.now() + 60_000,
    });

    const { GET } = await loadRoute();
    const res = await GET(createRequest(1) as any, {
      params: Promise.resolve({ id: "1" }),
    } as any);

    expect(mockRateLimit).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const csv = await res.text();
    expect(csv).toContain("rank,wallet,score,time,date");
    expect(csv).toContain(mockLeaderboard[0].address);
  });

  it("still returns 429 when the rate limit is genuinely exhausted", async () => {
    mockRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const { GET } = await loadRoute();
    const res = await GET(createRequest(1) as any, {
      params: Promise.resolve({ id: "1" }),
    } as any);

    expect(res.status).toBe(429);
    expect(mockGetHuntLeaderboard).not.toHaveBeenCalled();
  });
});
