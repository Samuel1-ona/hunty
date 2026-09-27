import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { usePlayerCount, getPlayerCountFromStorage, playerCountCache } from "./usePlayerCount"
import { TRENDING_PLAYER_THRESHOLD, PLAYER_COUNT_CACHE_TTL_MS } from "@/lib/types"

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

beforeEach(() => {
  vi.stubGlobal("localStorage", localStorageMock)
  localStorageMock.clear()
  playerCountCache.clear()
  seedCounter = 0
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── helpers ───────────────────────────────────────────────────────────────────

let seedCounter = 0

function seedRegistrations(huntId: string, count: number) {
  for (let i = 0; i < count; i++) {
    const unique = String(seedCounter++)
    localStorage.setItem(`hunt_registered_${huntId}_G${"X".repeat(54 - unique.length)}${unique}`, "true")
  }
}

// ── getPlayerCountFromStorage ─────────────────────────────────────────────────

describe("getPlayerCountFromStorage", () => {
  it("returns 0 when no registrations exist", () => {
    expect(getPlayerCountFromStorage("1")).toBe(0)
  })

  it("counts only keys for the given huntId", () => {
    seedRegistrations("1", 3)
    seedRegistrations("2", 5)
    expect(getPlayerCountFromStorage("1")).toBe(3)
    expect(getPlayerCountFromStorage("2")).toBe(5)
  })

  it("ignores keys with value !== 'true'", () => {
    localStorage.setItem("hunt_registered_1_GABC", "false")
    localStorage.setItem("hunt_registered_1_GDEF", "true")
    expect(getPlayerCountFromStorage("1")).toBe(1)
  })
})

// ── usePlayerCount ────────────────────────────────────────────────────────────

describe("usePlayerCount", () => {
  it("resolves count from localStorage", async () => {
    seedRegistrations("42", 3)
    const { result } = renderHook(() => usePlayerCount("42"))
    await act(async () => {})
    expect(result.current.isLoading).toBe(false)
    expect(result.current.count).toBe(3)
    expect(result.current.error).toBeNull()
  })

  it("sets isTrending when count >= TRENDING_PLAYER_THRESHOLD", async () => {
    seedRegistrations("10", TRENDING_PLAYER_THRESHOLD)
    const { result } = renderHook(() => usePlayerCount("10"))
    await act(async () => {})
    expect(result.current.isTrending).toBe(true)
  })

  it("does not set isTrending when count < TRENDING_PLAYER_THRESHOLD", async () => {
    seedRegistrations("11", TRENDING_PLAYER_THRESHOLD - 1)
    const { result } = renderHook(() => usePlayerCount("11"))
    await act(async () => {})
    expect(result.current.isTrending).toBe(false)
  })

  it("uses cache when entry is fresh — no second localStorage scan", async () => {
    seedRegistrations("5", 2)
    // Prime cache
    const { result: r1 } = renderHook(() => usePlayerCount("5"))
    await act(async () => {})
    expect(r1.current.count).toBe(2)

    // Add more registrations — should NOT be picked up (cache is fresh)
    seedRegistrations("5", 1)
    const { result: r2 } = renderHook(() => usePlayerCount("5"))
    await act(async () => {})
    expect(r2.current.count).toBe(2) // still cached value
  })

  it("re-fetches when cache is manually cleared", async () => {
    seedRegistrations("7", 1)
    const { result: r1 } = renderHook(() => usePlayerCount("7"))
    await act(async () => {})
    expect(r1.current.count).toBe(1)

    // Clear cache and add another registration
    playerCountCache.clear()
    seedRegistrations("7", 1)

    const { result: r2 } = renderHook(() => usePlayerCount("7"))
    await act(async () => {})
    expect(r2.current.count).toBe(2)
  })

  it("re-fetches when cache TTL has expired", async () => {
    vi.useFakeTimers()
    seedRegistrations("9", 1)
    const { result: r1 } = renderHook(() => usePlayerCount("9"))
    await act(async () => { vi.runAllTimers() })
    expect(r1.current.count).toBe(1)

    // Expire the cache entry manually
    const entry = playerCountCache.get("9")!
    playerCountCache.set("9", { ...entry, fetchedAt: Date.now() - PLAYER_COUNT_CACHE_TTL_MS - 1 })

    seedRegistrations("9", 1)
    const { result: r2 } = renderHook(() => usePlayerCount("9"))
    await act(async () => { vi.runAllTimers() })
    expect(r2.current.count).toBe(2)
    vi.useRealTimers()
  })

  it("returns error result when huntId is empty", async () => {
    const { result } = renderHook(() => usePlayerCount(""))
    await act(async () => {})
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeTruthy()
  })
})
