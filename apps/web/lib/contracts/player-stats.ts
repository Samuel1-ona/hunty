import type { PlayerStats } from "@/lib/types"

const PLAYER_STATS_KEY_PREFIX = "hunty_player_stats_"

function getStorageKey(address: string): string {
  return `${PLAYER_STATS_KEY_PREFIX}${address}`
}

function createEmptyStats(address: string): PlayerStats {
  return {
    address,
    totalHuntsCompleted: 0,
    totalPointsEarned: 0,
    totalNftsReceived: 0,
    totalCompletionTimeSeconds: 0,
    completedHuntsTracked: 0,
    averageCompletionTimeSeconds: 0,
    lastUpdated: Date.now(),
  }
}

function readStats(address: string): PlayerStats {
  if (typeof window === "undefined") {
    return createEmptyStats(address)
  }

  try {
    const raw = localStorage.getItem(getStorageKey(address))
    if (!raw) return createEmptyStats(address)
    const parsed = JSON.parse(raw) as Partial<PlayerStats>
    const totalCompletionTimeSeconds = parsed.totalCompletionTimeSeconds ?? 0
    const completedHuntsTracked = parsed.completedHuntsTracked ?? 0

    return {
      ...createEmptyStats(address),
      ...parsed,
      totalCompletionTimeSeconds,
      completedHuntsTracked,
      averageCompletionTimeSeconds:
        completedHuntsTracked > 0
          ? totalCompletionTimeSeconds / completedHuntsTracked
          : 0,
    }
  } catch {
    return createEmptyStats(address)
  }
}

function writeStats(stats: PlayerStats): void {
  if (typeof window === "undefined") return
  localStorage.setItem(getStorageKey(stats.address), JSON.stringify(stats))
}

export function get_player_stats(address: string): PlayerStats {
  return readStats(address)
}

export function recordHuntCompletion(
  address: string,
  payload: {
    huntId: number
    pointsEarned: number
    completionTimeSeconds: number
  },
): PlayerStats {
  const current = readStats(address)
  const next: PlayerStats = {
    ...current,
    totalHuntsCompleted: current.totalHuntsCompleted + 1,
    totalPointsEarned: current.totalPointsEarned + payload.pointsEarned,
    totalCompletionTimeSeconds: current.totalCompletionTimeSeconds + payload.completionTimeSeconds,
    completedHuntsTracked: current.completedHuntsTracked + 1,
    averageCompletionTimeSeconds:
      current.completedHuntsTracked + 1 > 0
        ? (current.totalCompletionTimeSeconds + payload.completionTimeSeconds) /
          (current.completedHuntsTracked + 1)
        : 0,
    lastUpdated: Date.now(),
  }

  writeStats(next)
  return next
}

export function recordNftReceived(address: string): PlayerStats {
  const current = readStats(address)
  const next: PlayerStats = {
    ...current,
    totalNftsReceived: current.totalNftsReceived + 1,
    lastUpdated: Date.now(),
  }
  writeStats(next)
  return next
}

export function clearPlayerStats(address: string): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(getStorageKey(address))
}
