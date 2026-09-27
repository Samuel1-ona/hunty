import { describe, it, expect, beforeEach } from "vitest"
import { getAllHuntsIncludingPrivate, addHunt, setLocalFeaturedHunt } from "@/lib/huntStore"
import type { StoredHunt } from "@/lib/types"

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(global, "localStorage", { value: localStorageMock })

const hunt1: StoredHunt = {
  id: 101,
  title: "First Hunt",
  description: "Description 1",
  cluesCount: 3,
  status: "Active",
  rewardType: "XLM",
}

const hunt2: StoredHunt = {
  id: 102,
  title: "Second Hunt",
  description: "Description 2",
  cluesCount: 5,
  status: "Active",
  rewardType: "NFT",
}

describe("Featured Hunt of the Week Curation", () => {
  beforeEach(() => {
    localStorageMock.clear()
    addHunt(hunt1)
    addHunt(hunt2)
  })

  it("can set a hunt as the featured hunt of the week and resets all others", () => {
    setLocalFeaturedHunt(101)

    const all = getAllHuntsIncludingPrivate()
    const fh1 = all.find((h) => h.id === 101)
    const fh2 = all.find((h) => h.id === 102)

    expect(fh1?.isFeaturedOfWeek).toBe(true)
    expect(fh2?.isFeaturedOfWeek).toBe(false)
  })

  it("clears all featured flags when setting featured hunt to null", () => {
    // First, set hunt1 as featured
    setLocalFeaturedHunt(101)
    
    // Now, clear it
    setLocalFeaturedHunt(null)

    const all = getAllHuntsIncludingPrivate()
    const fh1 = all.find((h) => h.id === 101)
    const fh2 = all.find((h) => h.id === 102)

    expect(fh1?.isFeaturedOfWeek).toBe(false)
    expect(fh2?.isFeaturedOfWeek).toBe(false)
  })

  it("can switch the featured hunt and automatically clears the previous one", () => {
    setLocalFeaturedHunt(101)
    setLocalFeaturedHunt(102)

    const all = getAllHuntsIncludingPrivate()
    const fh1 = all.find((h) => h.id === 101)
    const fh2 = all.find((h) => h.id === 102)

    expect(fh1?.isFeaturedOfWeek).toBe(false)
    expect(fh2?.isFeaturedOfWeek).toBe(true)
  })
})
