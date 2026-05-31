/**
 * Shared hunt list for dashboard (creator hunts) and Game Arcade (active hunts).
 * Persisted in localStorage so activated hunts appear in the arcade after refresh.
 */

import type { HuntStatus, StoredHunt, Clue } from "@/lib/types"

export type { HuntStatus, StoredHunt, Clue }

export type HuntStoreSnapshot = {
  hunts: StoredHunt[]
  clues: Clue[]
}

const STORAGE_KEY = "hunty_hunts"
const CLUES_KEY = "hunty_clues"

// Seed timestamps: active hunts end 7 days from first load, completed hunts in the past.
const NOW_SECONDS = Math.floor(Date.now() / 1000)

export const SEED_HUNTS: StoredHunt[] = [
  {
    id: 1,
    title: "City Secrets",
    description: "Race across town to uncover hidden murals and landmarks.",
    cluesCount: 5,
    status: "Active",
    rewardType: "XLM",
    rewardPool: 150,
    playerCount: 32,
    createdAt: NOW_SECONDS - 2 * 86400,
    startTime: NOW_SECONDS - 86400,
    endTime: NOW_SECONDS + 7 * 86400,
  },
  {
    id: 2,
    title: "Campus Quest",
    description: "Solve riddles scattered around campus before the timer ends.",
    cluesCount: 7,
    status: "Active",
    rewardType: "NFT",
    rewardPool: 40,
    playerCount: 21,
    createdAt: NOW_SECONDS - 4 * 86400,
    startTime: NOW_SECONDS - 2 * 86400,
    endTime: NOW_SECONDS + 3 * 86400,
  },
  {
    id: 3,
    title: "Office Onboarding Hunt",
    description: "A playful intro game for new teammates around the office.",
    cluesCount: 4,
    status: "Completed",
    rewardType: "Both",
    rewardPool: 250,
    playerCount: 14,
    createdAt: NOW_SECONDS - 12 * 86400,
    startTime: NOW_SECONDS - 10 * 86400,
    endTime: NOW_SECONDS - 5 * 86400,
  },
  {
    id: 4,
    title: "Summer Treasure Hunt",
    description: "Find hidden clues in the park.",
    cluesCount: 3,
    status: "Draft",
    rewardType: "XLM",
    rewardPool: 80,
    playerCount: 0,
    createdAt: NOW_SECONDS - 3 * 86400,
  },
  {
    id: 5,
    title: "Museum Mystery",
    description: "Discover art and history through clues.",
    cluesCount: 0,
    status: "Draft",
    rewardType: "NFT",
    rewardPool: 25,
    playerCount: 0,
    createdAt: NOW_SECONDS - 86400,
  },
]

function readClues(): Clue[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(CLUES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Clue[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeClues(clues: Clue[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CLUES_KEY, JSON.stringify(clues))
  } catch {
    // ignore
  }
}

function readHunts(): StoredHunt[] {
  if (typeof window === "undefined") return [...SEED_HUNTS]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...SEED_HUNTS]
    const parsed = JSON.parse(raw) as StoredHunt[]
    return Array.isArray(parsed) ? parsed : [...SEED_HUNTS]
  } catch {
    return [...SEED_HUNTS]
  }
}

function writeHunts(hunts: StoredHunt[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hunts))
  } catch {
    // ignore
  }
}

/** All hunts (for Game Arcade: filter by status === "Active"). Private hunts are excluded. */
export function getAllHunts(): StoredHunt[] {
  return readHunts().filter((h) => !h.is_private)
}

/** All hunts including private ones (for creator dashboard). */
export function getAllHuntsIncludingPrivate(): StoredHunt[] {
  return readHunts()
}

/** Creator hunts for dashboard (all stored hunts including private; creator filter can be added later). */
export function getCreatorHunts(): StoredHunt[] {
  return readHunts()
}

/** Get hunts for a creator (creator public-key filter not implemented yet; returns all hunts). */
export function getHuntsByCreator(creator?: string): StoredHunt[] {
  if (!creator) return readHunts()
  return readHunts().filter((hunt) => {
    const withCreator = hunt as StoredHunt & { creator?: string }
    return !withCreator.creator || withCreator.creator === creator
  })
}

/** Update a hunt's status (e.g. Draft → Active after activate_hunt). */
export function updateHuntStatus(huntId: number, status: HuntStatus): void {
  const hunts = readHunts().map((h) => (h.id === huntId ? { ...h, status } : h))
  writeHunts(hunts)
}

/** Update a hunt's end time (e.g. after extend_end_time). */
export function updateHuntEndTime(huntId: number, newEndTime: number): void {
  const hunts = readHunts().map((h) => (h.id === huntId ? { ...h, endTime: newEndTime } : h))
  writeHunts(hunts)
}

/** Delete multiple hunts by IDs. */
export function deleteHunts(ids: number[]): void {
  const hunts = readHunts().filter((h) => !ids.includes(h.id))
  writeHunts(hunts)
  
  // Also clean up clues for these hunts
  const allClues = readClues()
  const remainingClues = allClues.filter((c) => !ids.includes(c.huntId))
  writeClues(remainingClues)
}

/** Archive (Cancel) multiple hunts by IDs. */
export function archiveHunts(ids: number[]): void {
  const hunts = readHunts().map((h) => 
    ids.includes(h.id) ? { ...h, status: "Cancelled" as HuntStatus } : h
  )
  writeHunts(hunts)
}

/** Get a single hunt by ID */
export function getHuntById(id: number): StoredHunt | undefined {
  return readHunts().find((h) => h.id === id)
}

/** Add a new hunt (e.g. after createHunt). */
export function addHunt(hunt: StoredHunt): void {
  const hunts = readHunts()
  if (hunts.some((h) => h.id === hunt.id)) return
  writeHunts([...hunts, hunt])
}

/** Get all clues for a specific hunt. */
export function getHuntClues(huntId: number): Clue[] {
  return readClues().filter((c) => c.huntId === huntId)
}

/** Persist a new clue locally and increment the hunt's cluesCount. */
export function saveClueLocally(clue: Omit<Clue, "id">): void {
  const all = readClues()
  const newId = all.length > 0 ? Math.max(...all.map((c) => c.id)) + 1 : 1
  writeClues([...all, { ...clue, id: newId }])
  const hunts = readHunts().map((h) =>
    h.id === clue.huntId ? { ...h, cluesCount: h.cluesCount + 1 } : h
  )
  writeHunts(hunts)
}

/** Snapshot current hunts/clues for optimistic UI rollback. */
export function takeHuntStoreSnapshot(): HuntStoreSnapshot {
  return {
    hunts: readHunts(),
    clues: readClues(),
  }
}

/** Restore hunts/clues after an optimistic update fails. */
export function restoreHuntStoreSnapshot(snapshot: HuntStoreSnapshot): void {
  writeHunts(snapshot.hunts)
  writeClues(snapshot.clues)
}

/** Get a single hunt by string ID */
export const getHunt = (id: string) => {
  return readHunts().find((c) => c.id === Number(id))
}

/**
 * Return up to `limit` featured hunts, ranked by a trending score.
 * Score factors: clue count, reward type variety, time remaining, recency.
 */
export function getFeaturedHunts(limit = 3): StoredHunt[] {
  const now = Math.floor(Date.now() / 1000)
  const active = readHunts().filter((h) => h.status === "Active" && !h.is_private)

  const scored = active.map((hunt) => {
    let score = 0
    // More clues = higher quality hunt
    score += hunt.cluesCount * 10
    // Dual-reward hunts are more attractive
    if (hunt.rewardType === "Both") score += 20
    else if (hunt.rewardType === "NFT") score += 10
    // Hunts ending soon get a boost (urgency)
    if (hunt.endTime) {
      const hoursLeft = (hunt.endTime - now) / 3600
      if (hoursLeft > 0 && hoursLeft < 48) score += 15
    }
    // Recently started hunts get a freshness boost
    if (hunt.startTime) {
      const daysSinceStart = (now - hunt.startTime) / 86400
      if (daysSinceStart < 3) score += 10
    }
    return { hunt, score }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.hunt)
}

/** Set/unset a hunt as the featured Hunt of the Week in local storage. */
export function setLocalFeaturedHunt(huntId: number | null): void {
  const hunts = readHunts().map((h) => ({
    ...h,
    isFeaturedOfWeek: h.id === huntId ? true : false,
  }))
  writeHunts(hunts)
}
