/**
 * Season management for seasonal leaderboard cycles.
 * Persisted in localStorage to track seasons, archives, and rewards.
 */

import type { Season, SeasonLeaderboardEntry, ArchivedSeason, SeasonBadge, Reward } from "@/lib/types"

export type { Season, SeasonLeaderboardEntry, ArchivedSeason, SeasonBadge, Reward }

const SEASONS_STORAGE_KEY = "hunty_seasons"
const ARCHIVED_SEASONS_KEY = "hunty_archived_seasons"
const SEASON_BADGES_KEY = "hunty_season_badges"

// Seed timestamps: current season ends 30 days from now, previous season ended 30 days ago
const NOW_SECONDS = Math.floor(Date.now() / 1000)

export const SEED_SEASONS: Season[] = [
  {
    id: 1,
    name: "Season 1: Genesis",
    startTime: NOW_SECONDS - 60 * 86400,
    endTime: NOW_SECONDS - 30 * 86400,
    status: "Ended",
    rewards: [
      { place: 1, amount: 500 },
      { place: 2, amount: 300 },
      { place: 3, amount: 150 },
      { place: 4, amount: 75 },
      { place: 5, amount: 50 },
    ],
  },
  {
    id: 2,
    name: "Season 2: Rising Stars",
    startTime: NOW_SECONDS - 30 * 86400,
    endTime: NOW_SECONDS + 30 * 86400,
    status: "Active",
    rewards: [
      { place: 1, amount: 750 },
      { place: 2, amount: 450 },
      { place: 3, amount: 200 },
      { place: 4, amount: 100 },
      { place: 5, amount: 75 },
    ],
  },
]

function readSeasons(): Season[] {
  if (typeof window === "undefined") return [...SEED_SEASONS]
  try {
    const raw = localStorage.getItem(SEASONS_STORAGE_KEY)
    if (!raw) return [...SEED_SEASONS]
    const parsed = JSON.parse(raw) as Season[]
    return Array.isArray(parsed) ? parsed : [...SEED_SEASONS]
  } catch {
    return [...SEED_SEASONS]
  }
}

function writeSeasons(seasons: Season[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(SEASONS_STORAGE_KEY, JSON.stringify(seasons))
  } catch {
    // ignore
  }
}

function readArchivedSeasons(): ArchivedSeason[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(ARCHIVED_SEASONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ArchivedSeason[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeArchivedSeasons(archived: ArchivedSeason[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(ARCHIVED_SEASONS_KEY, JSON.stringify(archived))
  } catch {
    // ignore
  }
}

function readSeasonBadges(): SeasonBadge[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(SEASON_BADGES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SeasonBadge[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeSeasonBadges(badges: SeasonBadge[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(SEASON_BADGES_KEY, JSON.stringify(badges))
  } catch {
    // ignore
  }
}

/** Get all seasons */
export function getAllSeasons(): Season[] {
  return readSeasons()
}

/** Get active season */
export function getActiveSeason(): Season | null {
  const seasons = readSeasons()
  const now = Math.floor(Date.now() / 1000)
  return seasons.find((s) => s.status === "Active" && s.startTime <= now && s.endTime >= now) || null
}

/** Get season by ID */
export function getSeasonById(id: number): Season | undefined {
  return readSeasons().find((s) => s.id === id)
}

/** Create a new season */
export function createSeason(season: Omit<Season, "id">): Season {
  const seasons = readSeasons()
  const newId = seasons.length > 0 ? Math.max(...seasons.map((s) => s.id)) + 1 : 1
  const newSeason: Season = { ...season, id: newId }
  writeSeasons([...seasons, newSeason])
  return newSeason
}

/** Update season status */
export function updateSeasonStatus(seasonId: number, status: Season["status"]): void {
  const seasons = readSeasons().map((s) => (s.id === seasonId ? { ...s, status } : s))
  writeSeasons(seasons)
}

/** Archive a season with its final leaderboard */
export function archiveSeason(seasonId: number, finalLeaderboard: SeasonLeaderboardEntry[]): ArchivedSeason {
  const season = getSeasonById(seasonId)
  if (!season) throw new Error(`Season ${seasonId} not found`)

  const archived: ArchivedSeason = {
    season: { ...season, status: "Ended" },
    finalLeaderboard: finalLeaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    })),
    archivedAt: Math.floor(Date.now() / 1000),
  }

  const archivedSeasons = readArchivedSeasons()
  writeArchivedSeasons([...archivedSeasons, archived])

  // Update season status to Ended
  updateSeasonStatus(seasonId, "Ended")

  return archived
}

/** Get all archived seasons */
export function getArchivedSeasons(): ArchivedSeason[] {
  return readArchivedSeasons()
}

/** Get archived season by ID */
export function getArchivedSeasonById(id: number): ArchivedSeason | undefined {
  return readArchivedSeasons().find((a) => a.season.id === id)
}

/** Award season badge to a participant */
export function awardSeasonBadge(seasonId: number, address: string, name?: string, rank?: number): SeasonBadge {
  const season = getSeasonById(seasonId)
  if (!season) throw new Error(`Season ${seasonId} not found`)

  const badges = readSeasonBadges()
  const existingBadge = badges.find((b) => b.seasonId === seasonId && b.address === address)
  
  if (existingBadge) {
    // Update existing badge with rank if season ended
    if (rank !== undefined) {
      const updated = badges.map((b) =>
        b.seasonId === seasonId && b.address === address
          ? { ...b, rank }
          : b
      )
      writeSeasonBadges(updated)
      return { ...existingBadge, rank }
    }
    return existingBadge
  }

  const newBadge: SeasonBadge = {
    seasonId,
    seasonName: season.name,
    address,
    name,
    rank,
    earnedAt: Math.floor(Date.now() / 1000),
  }

  writeSeasonBadges([...badges, newBadge])
  return newBadge
}

/** Get season badges for a player */
export function getPlayerSeasonBadges(address: string): SeasonBadge[] {
  return readSeasonBadges().filter((b) => b.address === address)
}

/** Get all season badges */
export function getAllSeasonBadges(): SeasonBadge[] {
  return readSeasonBadges()
}

/** Get current season leaderboard (aggregated from all hunts in the season) */
export function getCurrentSeasonLeaderboard(): SeasonLeaderboardEntry[] {
  const activeSeason = getActiveSeason()
  if (!activeSeason) return []

  // In a real implementation, this would aggregate from all hunts in the season
  // For now, return mock data
  const mockLeaderboard: SeasonLeaderboardEntry[] = [
    { address: "GDD...9X2", name: "StellarQuest", points: 450 },
    { address: "GCT...Z9Y", name: "AliceCrypto", points: 380 },
    { address: "GFA...789", name: "BobHunts", points: 320 },
    { address: "GBX...A1B", points: 280 },
    { address: "GCA...HB2", points: 240 },
  ]

  return mockLeaderboard
}

/** Check if a season needs to be reset (ended) based on current time */
export function checkSeasonReset(): Season | null {
  const seasons = readSeasons()
  const now = Math.floor(Date.now() / 1000)
  
  for (const season of seasons) {
    if (season.status === "Active" && season.endTime < now) {
      return season
    }
  }
  
  return null
}

/** Calculate time remaining until season ends */
export function getSeasonTimeRemaining(seasonId: number): number {
  const season = getSeasonById(seasonId)
  if (!season || season.status !== "Active") return 0
  
  const now = Math.floor(Date.now() / 1000)
  return Math.max(0, season.endTime - now)
}
