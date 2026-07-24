import { getAllHunts, getHuntById, type StoredHunt } from "@/lib/huntStore"

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const queryCache = new Map<string, CacheEntry<unknown>>()
const queryCounter = new Map<string, number>()
const DEFAULT_CACHE_TTL_MS = 30_000
const SLOW_QUERY_THRESHOLD_MS = Number(process.env.SLOW_QUERY_THRESHOLD_MS ?? 75)

export const dbPoolConfig = {
  min: Number(process.env.DB_POOL_MIN ?? 2),
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMs: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? 30_000),
}

function nowMs() {
  return Date.now()
}

function readCache<T>(key: string): T | null {
  const cached = queryCache.get(key)
  if (!cached) return null
  if (cached.expiresAt < nowMs()) {
    queryCache.delete(key)
    return null
  }
  return cached.value as T
}

function writeCache<T>(key: string, value: T, ttlMs = DEFAULT_CACHE_TTL_MS): T {
  queryCache.set(key, { value, expiresAt: nowMs() + ttlMs })
  return value
}

function logSlowQuery(queryName: string, durationMs: number, meta: Record<string, unknown>) {
  if (durationMs <= SLOW_QUERY_THRESHOLD_MS) return
  // eslint-disable-next-line no-console
  console.warn(`[slow-query] ${queryName} took ${durationMs.toFixed(1)}ms`, meta)
}

function trackPotentialNPlusOne(queryName: string, requestId?: string) {
  if (!requestId) return
  const key = `${requestId}:${queryName}`
  const count = (queryCounter.get(key) ?? 0) + 1
  queryCounter.set(key, count)

  if (count === 8) {
    // eslint-disable-next-line no-console
    console.warn(`[n+1-detected] Query ${queryName} was called repeatedly in request ${requestId}.`)
  }
}

function withTimedQuery<T>(queryName: string, meta: Record<string, unknown>, fn: () => T): T {
  const startedAt = performance.now()
  const result = fn()
  logSlowQuery(queryName, performance.now() - startedAt, meta)
  return result
}

function buildHuntIndexes() {
  const hunts = getAllHunts()
  const huntsById = new Map<number, StoredHunt>()
  const activePublicHunts: StoredHunt[] = []

  for (const hunt of hunts) {
    huntsById.set(hunt.id, hunt)
    if (hunt.status === "Active" && !hunt.is_private) {
      activePublicHunts.push(hunt)
    }
  }

  activePublicHunts.sort((a, b) => b.id - a.id)

  return { huntsById, activePublicHunts }
}

export function getPublicHuntByIdOptimized(huntId: number, requestId?: string): StoredHunt | undefined {
  trackPotentialNPlusOne("getPublicHuntByIdOptimized", requestId)

  return withTimedQuery("getPublicHuntByIdOptimized", { huntId }, () => {
    const cacheKey = `hunt:${huntId}`
    const cached = readCache<StoredHunt | undefined>(cacheKey)
    if (cached !== null) return cached

    const { huntsById } = buildHuntIndexes()
    const hunt = huntsById.get(huntId) ?? getHuntById(huntId)
    if (hunt?.is_private) {
      return writeCache(cacheKey, undefined)
    }
    return writeCache(cacheKey, hunt)
  })
}

export function listPublicActiveHuntsByCursorOptimized(params: {
  cursor: number | null
  limit: number
  status?: string | null
  reward?: string | null
  search?: string | null
  sortBy?: string | null
  requestId?: string
}) {
  const {
    cursor,
    limit,
    status = "Active",
    reward = "all",
    search = "",
    sortBy = "newest",
    requestId,
  } = params
  trackPotentialNPlusOne("listPublicActiveHuntsByCursorOptimized", requestId)

  return withTimedQuery(
    "listPublicActiveHuntsByCursorOptimized",
    { cursor, limit, status, reward, search, sortBy },
    () => {
      const cacheKey = `active:${cursor ?? "start"}:${limit}:${status ?? "all"}:${reward ?? "all"}:${search ?? ""}:${sortBy ?? "newest"}`
      const cached = readCache<{ data: StoredHunt[]; nextCursor: number | null; total: number }>(cacheKey)
      if (cached) return cached

      // Get all hunts (which already filters out private hunts)
      const allHunts = getAllHunts()

      // Filter hunts based on parameters
      const filteredHunts = allHunts.filter((hunt) => {
        // Status filter:
        // "all" -> match both Active and Completed
        // "Active" -> match only Active
        // "Completed" -> match only Completed
        const matchesStatus =
          status === "all" || !status
            ? (hunt.status === "Active" || hunt.status === "Completed")
            : hunt.status === status

        // Reward filter:
        const matchesReward =
          reward === "all" || !reward
            ? true
            : hunt.rewardType === reward ||
              (reward !== "Both" && hunt.rewardType === "Both") ||
              (reward === "Both" && hunt.rewardType === "Both")

        // Search filter:
        const matchesSearch =
          !search ||
          hunt.title.toLowerCase().includes(search.toLowerCase()) ||
          hunt.description.toLowerCase().includes(search.toLowerCase())

        return matchesStatus && matchesReward && matchesSearch
      })

      // Sort hunts
      filteredHunts.sort((a, b) => {
        if (sortBy === "newest") return (b.startTime ?? 0) - (a.startTime ?? 0)
        if (sortBy === "oldest") return (a.startTime ?? 0) - (b.startTime ?? 0)
        if (sortBy === "clues-high") return b.cluesCount - a.cluesCount
        if (sortBy === "clues-low") return a.cluesCount - b.cluesCount
        return 0
      })

      // Apply cursor pagination
      let startIndex = 0
      if (cursor !== null) {
        const index = filteredHunts.findIndex((hunt) => hunt.id === cursor)
        if (index !== -1) {
          startIndex = index + 1
        }
      }

      const page = filteredHunts.slice(startIndex, startIndex + limit)
      const nextCursor = page.length === limit ? page[page.length - 1]?.id ?? null : null

      return writeCache(cacheKey, {
        data: page,
        nextCursor,
        total: filteredHunts.length,
      })
    }
  )
}
