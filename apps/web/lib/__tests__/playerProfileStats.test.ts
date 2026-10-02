import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { PLAYER_PROFILE_STATS } from "@/lib/config/constants"
import { clearProfileSummaryCache, getPlayerProfileSummary } from "@/lib/playerProfileStats"
import type { LeaderboardEntry, StoredHunt } from "@/lib/types"

vi.mock("@/lib/contracts/hunt", () => ({
  get_hunt_leaderboard: vi.fn(),
}))

vi.mock("@/lib/huntStore", () => ({
  SEED_HUNTS: [],
}))

import { get_hunt_leaderboard } from "@/lib/contracts/hunt"

const mockedGetLeaderboard = vi.mocked(get_hunt_leaderboard)

const ADDRESS = "GBRPYHIL2CI3FNQ4BXLFMNDLFPPPU2HY52WSGROMKTCVLA5WDWZTVLTC"

const hunts = [
  { id: 1, title: "City Secrets", category: "urban", rewardType: "NFT" },
] as StoredHunt[]

const entries: LeaderboardEntry[] = [
  { address: ADDRESS, points: 42 },
  { address: "GOTHER", points: 10 },
]

/** A syntactically distinct address per index, enough to fill the cache. */
function addressAt(index: number): string {
  return `G${String(index).padStart(55, "0")}`
}

describe("getPlayerProfileSummary cache", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearProfileSummaryCache()
    mockedGetLeaderboard.mockResolvedValue(entries)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("reads leaderboards once and serves the second call from cache", async () => {
    const first = await getPlayerProfileSummary(ADDRESS, hunts)
    const second = await getPlayerProfileSummary(ADDRESS, hunts)

    expect(mockedGetLeaderboard).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it("treats the address as case-insensitive and whitespace tolerant", async () => {
    await getPlayerProfileSummary(ADDRESS, hunts)
    await getPlayerProfileSummary(`  ${ADDRESS.toLowerCase()}  `, hunts)

    expect(mockedGetLeaderboard).toHaveBeenCalledTimes(1)
  })

  it("re-reads leaderboards once the TTL has elapsed", async () => {
    vi.useFakeTimers()
    mockedGetLeaderboard.mockResolvedValue(entries)

    await getPlayerProfileSummary(ADDRESS, hunts)
    vi.advanceTimersByTime(PLAYER_PROFILE_STATS.CACHE_TTL_MS - 1)
    await getPlayerProfileSummary(ADDRESS, hunts)
    expect(mockedGetLeaderboard).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(2)
    await getPlayerProfileSummary(ADDRESS, hunts)
    expect(mockedGetLeaderboard).toHaveBeenCalledTimes(2)
  })

  it("evicts least-recently-used entries once the size cap is exceeded", async () => {
    const { CACHE_MAX_ENTRIES } = PLAYER_PROFILE_STATS

    // Fill the cache to exactly the cap. Every address is a cache miss, so each
    // one costs a leaderboard read.
    for (let i = 0; i < CACHE_MAX_ENTRIES; i++) {
      await getPlayerProfileSummary(addressAt(i), hunts)
    }
    expect(mockedGetLeaderboard).toHaveBeenCalledTimes(CACHE_MAX_ENTRIES)

    // One more distinct address overflows the cap and evicts addressAt(0),
    // the least recently used entry.
    await getPlayerProfileSummary(addressAt(CACHE_MAX_ENTRIES), hunts)
    expect(mockedGetLeaderboard).toHaveBeenCalledTimes(CACHE_MAX_ENTRIES + 1)

    // The newest entries are still cached, so these cost no reads.
    await getPlayerProfileSummary(addressAt(CACHE_MAX_ENTRIES - 1), hunts)
    await getPlayerProfileSummary(addressAt(CACHE_MAX_ENTRIES), hunts)
    expect(mockedGetLeaderboard).toHaveBeenCalledTimes(CACHE_MAX_ENTRIES + 1)

    // The evicted entry is gone and has to be re-read.
    await getPlayerProfileSummary(addressAt(0), hunts)
    expect(mockedGetLeaderboard).toHaveBeenCalledTimes(CACHE_MAX_ENTRIES + 2)
  })

  it("keeps a re-read entry alive as most-recently-used", async () => {
    const { CACHE_MAX_ENTRIES } = PLAYER_PROFILE_STATS

    for (let i = 0; i < CACHE_MAX_ENTRIES; i++) {
      await getPlayerProfileSummary(addressAt(i), hunts)
    }

    // Touch addressAt(0) so it is no longer the LRU victim, then overflow.
    await getPlayerProfileSummary(addressAt(0), hunts)
    expect(mockedGetLeaderboard).toHaveBeenCalledTimes(CACHE_MAX_ENTRIES)

    await getPlayerProfileSummary(addressAt(CACHE_MAX_ENTRIES), hunts)
    await getPlayerProfileSummary(addressAt(0), hunts)

    // addressAt(0) was re-read once on insert and stayed cached after the
    // overflow, so the only extra read is the overflow itself.
    expect(mockedGetLeaderboard).toHaveBeenCalledTimes(CACHE_MAX_ENTRIES + 1)
  })

  it("does not serve a summary cached for a different hunt set", async () => {
    const twoHunts = [...hunts, { id: 2, title: "Campus Quest" } as StoredHunt]

    await getPlayerProfileSummary(ADDRESS, hunts)
    expect(mockedGetLeaderboard.mock.calls.map(([id]) => id)).toEqual([1])

    await getPlayerProfileSummary(ADDRESS, twoHunts)
    expect(mockedGetLeaderboard.mock.calls.map(([id]) => id)).toEqual([1, 1, 2])

    // Both variants are now cached independently.
    await getPlayerProfileSummary(ADDRESS, hunts)
    await getPlayerProfileSummary(ADDRESS, twoHunts)
    expect(mockedGetLeaderboard).toHaveBeenCalledTimes(3)
  })

  it("does not cache empty results for a blank address or no hunts", async () => {
    await getPlayerProfileSummary("   ", hunts)
    await getPlayerProfileSummary(ADDRESS, [])

    expect(mockedGetLeaderboard).not.toHaveBeenCalled()

    const summary = await getPlayerProfileSummary("   ", hunts)
    expect(summary).toEqual({
      address: "",
      stats: expect.objectContaining({ totalHuntsCompleted: 0 }),
      timeline: [],
    })
  })

  it("clearProfileSummaryCache forces the next call to re-read", async () => {
    await getPlayerProfileSummary(ADDRESS, hunts)
    clearProfileSummaryCache()
    await getPlayerProfileSummary(ADDRESS, hunts)

    expect(mockedGetLeaderboard).toHaveBeenCalledTimes(2)
  })
})
