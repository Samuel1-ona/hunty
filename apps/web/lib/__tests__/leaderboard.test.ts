import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRankedLeaderboard,
  computeLeaderboardStats,
  findPlayerRank,
  getHuntSummary,
  type RankedLeaderboardEntry,
} from '@/lib/leaderboard';
import type { LeaderboardEntry } from '@/lib/types';

vi.mock('@/lib/contracts/hunt', () => ({
  get_hunt_leaderboard: vi.fn(),
}));

vi.mock('@/lib/huntStore', () => ({
  SEED_HUNTS: [
    { id: 1, title: 'City Secrets' },
    { id: 2, title: 'Campus Quest' },
  ],
}));

import { get_hunt_leaderboard } from '@/lib/contracts/hunt';

const mockedGetLeaderboard = vi.mocked(get_hunt_leaderboard);

describe('getRankedLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sorts entries by points descending and assigns 1-based ranks', async () => {
    const raw: LeaderboardEntry[] = [
      { address: 'GBX', points: 30 },
      { address: 'GCT', name: 'Alice', points: 58 },
      { address: 'GDD', name: 'Stellar', points: 45 },
    ];
    mockedGetLeaderboard.mockResolvedValue(raw);
    const result = await getRankedLeaderboard(1);
    expect(result.map((e) => e.address)).toEqual(['GCT', 'GDD', 'GBX']);
    expect(result.map((e) => e.rank)).toEqual([1, 2, 3]);
    expect(result.map((e) => e.points)).toEqual([58, 45, 30]);
  });

  it('applies standard competition ranking for ties (1, 2, 2, 4)', async () => {
    const raw: LeaderboardEntry[] = [
      { address: 'A', points: 100 },
      { address: 'B', points: 50 },
      { address: 'C', points: 50 },
      { address: 'D', points: 10 },
    ];
    mockedGetLeaderboard.mockResolvedValue(raw);
    const result = await getRankedLeaderboard(1);
    expect(result.map((e) => e.rank)).toEqual([1, 2, 2, 4]);
  });

  it('does not mutate the original array returned by the data layer', async () => {
    const raw: LeaderboardEntry[] = [
      { address: 'A', points: 10 },
      { address: 'B', points: 90 },
    ];
    mockedGetLeaderboard.mockResolvedValue(raw);
    await getRankedLeaderboard(1);
    expect(raw.map((e) => e.address)).toEqual(['A', 'B']);
  });

  it('returns an empty array for an empty leaderboard', async () => {
    mockedGetLeaderboard.mockResolvedValue([]);
    const result = await getRankedLeaderboard(99);
    expect(result).toEqual([]);
  });
});

describe('computeLeaderboardStats', () => {
  it('computes totals and top score', () => {
    const entries: LeaderboardEntry[] = [
      { address: 'A', points: 58 },
      { address: 'B', points: 45 },
      { address: 'C', points: 30 },
    ];
    expect(computeLeaderboardStats(entries)).toEqual({
      totalPlayers: 3,
      topScore: 58,
      totalPoints: 133,
    });
  });

  it('returns zeroed stats for an empty board', () => {
    expect(computeLeaderboardStats([])).toEqual({
      totalPlayers: 0,
      topScore: 0,
      totalPoints: 0,
    });
  });
});

describe('findPlayerRank', () => {
  const ranked: RankedLeaderboardEntry[] = [
    { address: 'GCT', name: 'Alice', points: 58, rank: 1 },
    { address: 'GDD', name: 'Stellar', points: 45, rank: 2 },
    { address: 'GBX', points: 30, rank: 3 },
  ];

  it('finds a player by exact address', () => {
    expect(findPlayerRank(ranked, 'GDD')?.rank).toBe(2);
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(findPlayerRank(ranked, '  gct  ')?.name).toBe('Alice');
  });

  it('returns null for an address not on the board', () => {
    expect(findPlayerRank(ranked, 'GZZ')).toBeNull();
  });

  it('returns null for empty / nullish input', () => {
    expect(findPlayerRank(ranked, '')).toBeNull();
    expect(findPlayerRank(ranked, null)).toBeNull();
    expect(findPlayerRank(ranked, undefined)).toBeNull();
  });
});

describe('getHuntSummary', () => {
  it('returns the seeded title when the hunt id is known', () => {
    expect(getHuntSummary(1)).toEqual({ id: 1, title: 'City Secrets' });
  });

  it("falls back to 'Hunt #<id>' for an unknown hunt id", () => {
    expect(getHuntSummary(999)).toEqual({ id: 999, title: 'Hunt #999' });
  });
});
