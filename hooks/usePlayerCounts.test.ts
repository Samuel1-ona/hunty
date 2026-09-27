import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { usePlayerCounts } from "./usePlayerCounts"
import { playerCountCache } from "./usePlayerCount"
import { TRENDING_PLAYER_THRESHOLD } from "@/lib/types"

// ── localStorage mock ─────────────────────────────────────────────────────────

function makeLocalStorageMock() {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
}

const localStorageMock = makeLocalStorageMock()

let seedCounter = 0

beforeEach(() => {
  vi.stubGlobal("localStorage", localStorageMock)
  localStorageMock.clear()
  playerCountCache.clear()
  seedCounter = 0
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function seedRegistrations(huntId: string, count: number) {
  for (let i = 0; i < count; i++) {
    const unique = String(seedCounter++)
    localStorage.setItem(`hunt_registered_${huntId}_G${"X".repeat(54 - unique.length)}${unique}`, "true")
  }
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("usePlayerCounts", () => {
  it("returns counts for all provided hunt IDs", async () => {
    seedRegistrations("1", 3)
    seedRegistrations("2", 7)

    const { result } = renderHook(() => usePlayerCounts(["1", "2"]))
    await act(async () => {})

    expect(result.current.counts.get("1")?.count).toBe(3)
    expect(result.current.counts.get("2")?.count).toBe(7)
  })

  it("sets isTrending for hunts at or above threshold", async () => {
    seedRegistrations("10", TRENDING_PLAYER_THRESHOLD)
    seedRegistrations("11", TRENDING_PLAYER_THRESHOLD - 1)

    const { result } = renderHook(() => usePlayerCounts(["10", "11"]))
    await act(async () => {})

    expect(result.current.counts.get("10")?.isTrending).toBe(true)
    expect(result.current.counts.get("11")?.isTrending).toBe(false)
  })

  it("returns isLoading:false after settling", async () => {
    const { result } = renderHook(() => usePlayerCounts(["1"]))
    await act(async () => {})
    expect(result.current.isLoading).toBe(false)
  })

  it("uses cache — does not re-scan for fresh entries", async () => {
    seedRegistrations("5", 2)
    // Prime cache via first render
    const { result: r1 } = renderHook(() => usePlayerCounts(["5"]))
    await act(async () => {})
    expect(r1.current.counts.get("5")?.count).toBe(2)

    // Add more registrations — should NOT be picked up (cache is fresh)
    seedRegistrations("5", 3)
    const { result: r2 } = renderHook(() => usePlayerCounts(["5"]))
    await act(async () => {})
    expect(r2.current.counts.get("5")?.count).toBe(2)
  })

  it("refetch clears cache and re-fetches all IDs", async () => {
    seedRegistrations("3", 1)
    const { result } = renderHook(() => usePlayerCounts(["3"]))
    await act(async () => {})
    expect(result.current.counts.get("3")?.count).toBe(1)

    // Add more registrations then refetch
    seedRegistrations("3", 2)
    await act(async () => { result.current.refetch() })
    await act(async () => {})

    expect(result.current.counts.get("3")?.count).toBe(3)
  })

  it("handles empty huntIds array without error", async () => {
    const { result } = renderHook(() => usePlayerCounts([]))
    await act(async () => {})
    expect(result.current.counts.size).toBe(0)
    expect(result.current.isLoading).toBe(false)
  })

  it("one failed fetch does not prevent others from resolving", async () => {
    seedRegistrations("20", 4)

    // Make localStorage.key throw for hunt "99" only
    const originalKey = localStorageMock.key.bind(localStorageMock)
    let callCount = 0
    vi.spyOn(localStorageMock, "key").mockImplementation((index) => {
      // Throw on the first scan attempt (hunt "99" is fetched first alphabetically
      // in Promise.allSettled — we simulate by throwing once then recovering)
      callCount++
      if (callCount === 1) throw new Error("simulated storage error")
      return originalKey(index)
    })

    const { result } = renderHook(() => usePlayerCounts(["99", "20"]))
    await act(async () => {})

    // "20" should still resolve
    expect(result.current.counts.get("20")?.count).toBe(4)
    // "99" should have an error, not crash the hook
    expect(result.current.counts.get("99")?.error).toBeTruthy()
  })
})
