import { getAllHunts, getHuntById, type StoredHunt } from '@/lib/huntStore';
import { logger } from '@/lib/logger';
import { getHuntsWithRatings } from '@/lib/reviews';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const queryCache = new Map<string, CacheEntry<unknown>>();
const queryCounter = new Map<string, number>();
const DEFAULT_CACHE_TTL_MS = 30_000;
const SLOW_QUERY_THRESHOLD_MS = Number(process.env.SLOW_QUERY_THRESHOLD_MS ?? 75);

export const dbPoolConfig = {
  min: Number(process.env.DB_POOL_MIN ?? 2),
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMs: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? 30_000),
};

function nowMs() {
  return Date.now();
}

function readCache<T>(key: string): T | null {
  const cached = queryCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt < nowMs()) {
    queryCache.delete(key);
    return null;
  }
  return cached.value as T;
}

function writeCache<T>(key: string, value: T, ttlMs = DEFAULT_CACHE_TTL_MS): T {
  queryCache.set(key, { value, expiresAt: nowMs() + ttlMs });
  return value;
}

function logSlowQuery(queryName: string, durationMs: number, meta: Record<string, unknown>) {
  if (durationMs <= SLOW_QUERY_THRESHOLD_MS) return;
  logger.warn(`[slow-query] ${queryName} took ${durationMs.toFixed(1)}ms`, meta);
}

function trackPotentialNPlusOne(queryName: string, requestId?: string) {
  if (!requestId) return;
  const key = `${requestId}:${queryName}`;
  const count = (queryCounter.get(key) ?? 0) + 1;
  queryCounter.set(key, count);

  if (count === 8) {
    logger.warn(`[n+1-detected] Query ${queryName} was called repeatedly in request ${requestId}.`);
  }
}

function withTimedQuery<T>(queryName: string, meta: Record<string, unknown>, fn: () => T): T {
  const startedAt = performance.now();
  const result = fn();
  logSlowQuery(queryName, performance.now() - startedAt, meta);
  return result;
}

function buildHuntIndexes() {
  const hunts = getHuntsWithRatings(getAllHunts());
  const huntsById = new Map<number, StoredHunt>();
  const activePublicHunts: StoredHunt[] = [];

  for (const hunt of hunts) {
    huntsById.set(hunt.id, hunt);
    if (hunt.status === 'Active' && !hunt.is_private) {
      activePublicHunts.push(hunt);
    }
  }

  activePublicHunts.sort((a, b) => b.id - a.id);

  return { huntsById, activePublicHunts };
}

export function getPublicHuntByIdOptimized(
  huntId: number,
  requestId?: string
): StoredHunt | undefined {
  trackPotentialNPlusOne('getPublicHuntByIdOptimized', requestId);

  return withTimedQuery('getPublicHuntByIdOptimized', { huntId }, () => {
    const cacheKey = `hunt:${huntId}`;
    const cached = readCache<StoredHunt | undefined>(cacheKey);
    if (cached !== null) return cached;

    const { huntsById } = buildHuntIndexes();
    const hunt = huntsById.get(huntId) ?? getHuntById(huntId);
    if (hunt?.is_private) {
      return writeCache(cacheKey, undefined);
    }
    return writeCache(cacheKey, hunt);
  });
}

export function listPublicActiveHuntsByCursorOptimized(params: {
  cursor: number | null;
  limit: number;
  status?: string | null;
  reward?: string | null;
  difficulty?: string | null;
  category?: string | null;
  search?: string | null;
  sortBy?: string | null;
  ageClassification?: string | null;
  tag?: string | null;
  requestId?: string;
}) {
  const {
    cursor,
    limit,
    status = 'Active',
    reward = 'all',
    difficulty = 'all',
    category = 'all',
    search = '',
    sortBy = 'newest',
    ageClassification = 'all',
    tag = '',
    requestId,
  } = params;
  trackPotentialNPlusOne('listPublicActiveHuntsByCursorOptimized', requestId);

  return withTimedQuery(
    'listPublicActiveHuntsByCursorOptimized',
    { cursor, limit, status, reward, difficulty, category, search, sortBy, ageClassification, tag },
    () => {
      const cacheKey = `active:${cursor ?? 'start'}:${limit}:${status ?? 'all'}:${reward ?? 'all'}:${difficulty ?? 'all'}:${category ?? 'all'}:${search ?? ''}:${sortBy ?? 'newest'}:${ageClassification ?? 'all'}:${tag ?? ''}`;
      const cached = readCache<{ data: StoredHunt[]; nextCursor: number | null; total: number }>(
        cacheKey
      );
      if (cached) return cached;

      // Feed categories (trending, new, nearby, featured) alter filtering and sorting
      const FEED_CATEGORIES = ['trending', 'new', 'nearby', 'featured'];
      const isFeedCategory = FEED_CATEGORIES.includes(category ?? '');

      // Get all hunts (which already filters out private hunts)
      const allHunts = getAllHunts();

      // Filter hunts based on parameters
      const filteredHunts = allHunts.filter((hunt) => {
        // Status filter:
        // "all" -> match both Active and Completed
        // "Active" -> match only Active
        // "Completed" -> match only Completed
        const matchesStatus =
          status === 'all' || !status
            ? hunt.status === 'Active' || hunt.status === 'Completed'
            : hunt.status === status;

        // Reward filter:
        const matchesReward =
          reward === 'all' || !reward
            ? true
            : hunt.rewardType === reward ||
              (reward !== 'Both' && hunt.rewardType === 'Both') ||
              (reward === 'Both' && hunt.rewardType === 'Both');

        const matchesDifficulty =
          difficulty === 'all' || !difficulty
            ? true
            : (hunt.difficulty ?? 'Medium').toLowerCase() === difficulty.toLowerCase();

        // Feed categories bypass the hunt's own category filter
        const matchesCategory =
          category === 'all' || !category || isFeedCategory
            ? true
            : (hunt.category ?? 'General').toLowerCase() === category.toLowerCase();

        // Search filter:
        const matchesSearch =
          !search ||
          hunt.title.toLowerCase().includes(search.toLowerCase()) ||
          hunt.description.toLowerCase().includes(search.toLowerCase());

        // Tag filter: hunt must carry the requested discovery tag.
        const matchesTag =
          !tag || (hunt.tags ?? []).some((huntTag) => huntTag.toLowerCase() === tag.toLowerCase());

        const matchesAgeClassification =
          ageClassification === 'all' ||
          !ageClassification ||
          (hunt.ageClassification ?? 'all-ages') === ageClassification;

        return (
          matchesStatus &&
          matchesReward &&
          matchesDifficulty &&
          matchesCategory &&
          matchesSearch &&
          matchesTag &&
          matchesAgeClassification
        );
      });

      // Sort hunts
      filteredHunts.sort((a, b) => {
        // Feed category sorting takes priority
        if (isFeedCategory) {
          if (category === 'trending') {
            const aCount = a.playerCount ?? 0;
            const bCount = b.playerCount ?? 0;
            if (bCount !== aCount) return bCount - aCount;
            return b.cluesCount - a.cluesCount;
          }
          if (category === 'nearby') {
            return (b.startTime ?? 0) - (a.startTime ?? 0);
          }
          if (category === 'featured') {
            const aFeatured = a.isFeaturedOfWeek ? 1 : 0;
            const bFeatured = b.isFeaturedOfWeek ? 1 : 0;
            if (bFeatured !== aFeatured) return bFeatured - aFeatured;
            return (b.startTime ?? 0) - (a.startTime ?? 0);
          }
        }

        if (sortBy === 'rating-high') {
          const ratingA = a.averageRating ?? 0;
          const ratingB = b.averageRating ?? 0;
          if (ratingB !== ratingA) {
            return ratingB - ratingA;
          }
          return (b.startTime ?? 0) - (a.startTime ?? 0);
        }
        if (sortBy === 'newest') return (b.startTime ?? 0) - (a.startTime ?? 0);
        if (sortBy === 'oldest') return (a.startTime ?? 0) - (b.startTime ?? 0);
        if (sortBy === 'clues-high') return b.cluesCount - a.cluesCount;
        if (sortBy === 'clues-low') return a.cluesCount - b.cluesCount;
        if (sortBy === 'popular') return (b.playerCount ?? 0) - (a.playerCount ?? 0);
        if (sortBy === 'reward-high') return (b.rewardPool ?? 0) - (a.rewardPool ?? 0);
        if (sortBy === 'difficulty') {
          const rank: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };
          return (rank[b.difficulty ?? 'Medium'] ?? 2) - (rank[a.difficulty ?? 'Medium'] ?? 2);
        }
        return 0;
      });

      // Apply cursor pagination
      let startIndex = 0;
      if (cursor !== null) {
        const index = filteredHunts.findIndex((hunt) => hunt.id === cursor);
        if (index !== -1) {
          startIndex = index + 1;
        }
      }

      const page = filteredHunts.slice(startIndex, startIndex + limit);
      const nextCursor = page.length === limit ? (page[page.length - 1]?.id ?? null) : null;

      return writeCache(cacheKey, {
        data: page,
        nextCursor,
        total: filteredHunts.length,
      });
    }
  );
}
