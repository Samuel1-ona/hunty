import { describe, it, expect, beforeEach } from "vitest"
import { getAllHunts, getAllHuntsIncludingPrivate, addHunt } from "@/lib/huntStore"
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

const privateHunt: StoredHunt = {
  id: 999,
  title: "Secret Hunt",
  description: "Only for friends",
  cluesCount: 3,
  status: "Active",
  rewardType: "XLM",
  is_private: true,
}

const publicHunt: StoredHunt = {
  id: 998,
  title: "Public Hunt",
  description: "For everyone",
  cluesCount: 2,
  status: "Active",
  rewardType: "NFT",
  is_private: false,
}

describe("Private Hunts", () => {
  beforeEach(() => {
    localStorageMock.clear()
    addHunt(privateHunt)
    addHunt(publicHunt)
  })

  it("getAllHunts excludes private hunts from the public arcade", () => {
    const hunts = getAllHunts()
    const ids = hunts.map((h) => h.id)
    expect(ids).not.toContain(999)
  })

  it("getAllHunts includes public hunts", () => {
    const hunts = getAllHunts()
    const ids = hunts.map((h) => h.id)
    expect(ids).toContain(998)
  })

  it("getAllHuntsIncludingPrivate returns private hunts for the creator", () => {
    const hunts = getAllHuntsIncludingPrivate()
    const ids = hunts.map((h) => h.id)
    expect(ids).toContain(999)
    expect(ids).toContain(998)
  })

  it("private hunt has is_private flag set to true", () => {
    const all = getAllHuntsIncludingPrivate()
    const found = all.find((h) => h.id === 999)
    expect(found?.is_private).toBe(true)
  })
})
