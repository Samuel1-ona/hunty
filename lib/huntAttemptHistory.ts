import type {
  ClueAttemptRecord,
  FastestPlayerEntry,
  HuntAttemptRecord,
  HuntAttemptStatus,
  HuntAttemptTimeComparison,
} from "@/lib/types"

const ACTIVE_ATTEMPT_KEY_PREFIX = "hunty_active_attempt_"
const ATTEMPTS_KEY_PREFIX = "hunty_hunt_attempts_"

export function getAttemptsStorageKey(playerAddress: string): string {
  return `${ATTEMPTS_KEY_PREFIX}${playerAddress}`
}

export function getActiveAttemptKey(playerAddress: string, huntId: number): string {
  return `${ACTIVE_ATTEMPT_KEY_PREFIX}${playerAddress}_${huntId}`
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainingSeconds = safeSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m ${remainingSeconds.toString().padStart(2, "0")}s`
  }

  return `${minutes}m ${remainingSeconds.toString().padStart(2, "0")}s`
}

function createAttemptId(): string {
  return `attempt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function readAttempts(playerAddress: string): HuntAttemptRecord[] {
  if (typeof window === "undefined" || !playerAddress) return []

  try {
    const raw = localStorage.getItem(getAttemptsStorageKey(playerAddress))
    if (!raw) return []
    const parsed = JSON.parse(raw) as HuntAttemptRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAttempts(playerAddress: string, attempts: HuntAttemptRecord[]): void {
  if (typeof window === "undefined" || !playerAddress) return
  localStorage.setItem(getAttemptsStorageKey(playerAddress), JSON.stringify(attempts))
}

export function getPlayerAttempts(
  playerAddress: string,
  options?: { status?: HuntAttemptStatus | "all" }
): HuntAttemptRecord[] {
  const attempts = readAttempts(playerAddress)
    .filter((attempt) => attempt.status !== "in_progress")
    .sort((left, right) => {
      const leftTime = new Date(left.completedAt ?? left.startedAt).getTime()
      const rightTime = new Date(right.completedAt ?? right.startedAt).getTime()
      return rightTime - leftTime
    })

  if (!options?.status || options.status === "all") {
    return attempts
  }

  return attempts.filter((attempt) => attempt.status === options.status)
}

export function getAttemptById(
  playerAddress: string,
  attemptId: string
): HuntAttemptRecord | null {
  return readAttempts(playerAddress).find((attempt) => attempt.id === attemptId) ?? null
}

export function getActiveAttempt(
  playerAddress: string,
  huntId: number
): HuntAttemptRecord | null {
  if (typeof window === "undefined" || !playerAddress) return null

  const activeId = localStorage.getItem(getActiveAttemptKey(playerAddress, huntId))
  if (!activeId) return null

  const attempt = readAttempts(playerAddress).find(
    (entry) => entry.id === activeId && entry.status === "in_progress"
  )

  return attempt ?? null
}

export function startHuntAttempt(
  playerAddress: string,
  huntId: number,
  huntTitle: string
): HuntAttemptRecord {
  const attempts = readAttempts(playerAddress)
  const previousAttempts = attempts.filter(
    (attempt) => attempt.huntId === huntId && attempt.status !== "in_progress"
  )

  const attempt: HuntAttemptRecord = {
    id: createAttemptId(),
    huntId,
    huntTitle,
    playerAddress,
    status: "in_progress",
    startedAt: new Date().toISOString(),
    totalTimeSeconds: 0,
    totalPoints: 0,
    clues: [],
    attemptNumber: previousAttempts.length + 1,
  }

  attempts.unshift(attempt)
  writeAttempts(playerAddress, attempts)
  localStorage.setItem(getActiveAttemptKey(playerAddress, huntId), attempt.id)

  return attempt
}

function updateAttempt(
  playerAddress: string,
  attemptId: string,
  updater: (attempt: HuntAttemptRecord) => HuntAttemptRecord
): HuntAttemptRecord | null {
  const attempts = readAttempts(playerAddress)
  const index = attempts.findIndex((attempt) => attempt.id === attemptId)
  if (index === -1) return null

  const updated = updater(attempts[index])
  attempts[index] = updated
  writeAttempts(playerAddress, attempts)
  return updated
}

export function recordClueAttempt(
  playerAddress: string,
  attemptId: string,
  clueRecord: ClueAttemptRecord
): HuntAttemptRecord | null {
  return updateAttempt(playerAddress, attemptId, (attempt) => {
    const existingIndex = attempt.clues.findIndex(
      (clue) => clue.clueId === clueRecord.clueId
    )
    const clues =
      existingIndex === -1
        ? [...attempt.clues, clueRecord]
        : attempt.clues.map((clue, index) =>
            index === existingIndex ? clueRecord : clue
          )

    const totalTimeSeconds = clues.reduce(
      (sum, clue) => sum + clue.timeTakenSeconds,
      0
    )
    const totalPoints = clues.reduce((sum, clue) => sum + clue.pointsEarned, 0)

    return {
      ...attempt,
      clues,
      totalTimeSeconds,
      totalPoints,
    }
  })
}

export function completeHuntAttempt(
  playerAddress: string,
  attemptId: string,
  totalPoints?: number
): HuntAttemptRecord | null {
  const completed = updateAttempt(playerAddress, attemptId, (attempt) => ({
    ...attempt,
    status: "completed" as const,
    completedAt: new Date().toISOString(),
    totalPoints: totalPoints ?? attempt.totalPoints,
  }))

  if (completed) {
    localStorage.removeItem(getActiveAttemptKey(playerAddress, completed.huntId))
  }

  return completed
}

export function abandonHuntAttempt(
  playerAddress: string,
  attemptId: string
): HuntAttemptRecord | null {
  const abandoned = updateAttempt(playerAddress, attemptId, (attempt) => ({
    ...attempt,
    status: "abandoned" as const,
    completedAt: new Date().toISOString(),
  }))

  if (abandoned) {
    localStorage.removeItem(getActiveAttemptKey(playerAddress, abandoned.huntId))
  }

  return abandoned
}

export function ensureActiveAttempt(
  playerAddress: string,
  huntId: number,
  huntTitle: string
): HuntAttemptRecord {
  return getActiveAttempt(playerAddress, huntId) ?? startHuntAttempt(playerAddress, huntId, huntTitle)
}

export function clearHuntPlayState(huntId: number): void {
  if (typeof window === "undefined") return

  const keysToRemove: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key) continue

    if (
      key.startsWith(`hunt_clue_start_${huntId}_`) ||
      key.startsWith(`hunt_clue_solved_${huntId}_`) ||
      key === `hunt_${huntId}_my_points` ||
      key === `hunt_completed_${huntId}`
    ) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key))
}

export function prepareHuntReattempt(playerAddress: string, huntId: number): void {
  const activeAttempt = getActiveAttempt(playerAddress, huntId)
  if (activeAttempt) {
    abandonHuntAttempt(playerAddress, activeAttempt.id)
  }
  clearHuntPlayState(huntId)
}

export function getClueElapsedSeconds(huntId: number, clueId: number): number {
  if (typeof window === "undefined") return 0

  const startTimeStr = localStorage.getItem(`hunt_clue_start_${huntId}_${clueId}`)
  if (!startTimeStr) return 0

  const startTime = parseInt(startTimeStr, 10)
  if (Number.isNaN(startTime)) return 0

  return Math.max(0, Math.round((Date.now() - startTime) / 1000))
}

export function compareAttemptWithLeaderboard(
  attempt: HuntAttemptRecord,
  fastestPlayers: FastestPlayerEntry[]
): HuntAttemptTimeComparison {
  const playerTimeSeconds = attempt.totalTimeSeconds
  const playerTimeLabel = formatDuration(playerTimeSeconds)

  if (fastestPlayers.length === 0) {
    return {
      playerTimeSeconds,
      playerTimeLabel,
      fastestTimeSeconds: null,
      fastestTimeLabel: null,
      averageTimeSeconds: null,
      averageTimeLabel: null,
      rankAmongFastest: null,
      totalComparedPlayers: 0,
    }
  }

  const sortedTimes = [...fastestPlayers]
    .map((entry) => entry.completionTimeSeconds)
    .sort((left, right) => left - right)

  const fastestTimeSeconds = sortedTimes[0]
  const averageTimeSeconds = Math.round(
    sortedTimes.reduce((sum, value) => sum + value, 0) / sortedTimes.length
  )

  const combinedTimes = [...sortedTimes, playerTimeSeconds].sort((left, right) => left - right)
  const rankAmongFastest = combinedTimes.indexOf(playerTimeSeconds) + 1

  return {
    playerTimeSeconds,
    playerTimeLabel,
    fastestTimeSeconds,
    fastestTimeLabel: formatDuration(fastestTimeSeconds),
    averageTimeSeconds,
    averageTimeLabel: formatDuration(averageTimeSeconds),
    rankAmongFastest,
    totalComparedPlayers: fastestPlayers.length,
  }
}
