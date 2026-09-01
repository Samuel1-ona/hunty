/**
 * Analytics cache — thin TTL-based cache for hunt analytics reads.
 *
 * Strategy mirrors rate-limit.ts: in-memory Map when Upstash env vars are
 * absent, Upstash Redis when they are present.  The same singleton pattern
 * is used so the store is reused across warm serverless invocations.
 *
 * TTL: ANALYTICS_CACHE_TTL_SECONDS (default 60s).
 *
 * Invalidation: call invalidate(huntId) after any write to that hunt's row.
 * This ensures reads never serve data older than one TTL period, and that
 * consumers who write-then-read immediately always see fresh data.
 */

// The cache value type is declared here rather than imported from
// huntAnalytics.ts to avoid a circular module dependency.
// huntAnalytics  →  analyticsCache  →  huntAnalytics  (cycle)
// Callers cast through their own HuntAnalyticsResponse type at the boundary.
export type CachedAnalytics = {
  huntId: number;
  views: number;
  starts: number;
  completions: number;
  totalCompletionTimeSeconds: number;
  clueDropOff: unknown[];
  demographics: unknown[];
  timeSeries: unknown[];
  updatedAt: string;
  completionRate: number;
  avgCompletionTimeSeconds: number | null;
};

export const CACHE_TTL_SECONDS = Number(process.env.ANALYTICS_CACHE_TTL_SECONDS ?? 60);

// ─── Store interface ──────────────────────────────────────────────────────────

interface AnalyticsStore {
  get(huntId: number): Promise<CachedAnalytics | null>;
  set(huntId: number, value: CachedAnalytics, ttlSeconds: number): Promise<void>;
  del(huntId: number): Promise<void>;
}

// ─── In-memory store ──────────────────────────────────────────────────────────

function createInMemoryStore(): AnalyticsStore {
  const map = new Map<number, { value: CachedAnalytics; expires: number }>();

  return {
    async get(huntId) {
      const entry = map.get(huntId);
      if (!entry || Date.now() > entry.expires) {
        map.delete(huntId);
        return null;
      }
      return entry.value;
    },
    async set(huntId, value, ttlSeconds) {
      map.set(huntId, { value, expires: Date.now() + ttlSeconds * 1000 });
    },
    async del(huntId) {
      map.delete(huntId);
    },
  };
}

// ─── Redis (Upstash) store ────────────────────────────────────────────────────

async function createRedisStore(): Promise<AnalyticsStore> {
  const { Redis } = await import("@upstash/redis");
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const key = (huntId: number) => `analytics:${huntId}`;

  return {
    async get(huntId) {
      const raw = await redis.get<CachedAnalytics>(key(huntId));
      return raw ?? null;
    },
    async set(huntId, value, ttlSeconds) {
      await redis.set(key(huntId), value, { ex: ttlSeconds });
    },
    async del(huntId) {
      await redis.del(key(huntId));
    },
  };
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let storePromise: Promise<AnalyticsStore> | null = null;

function getStore(): Promise<AnalyticsStore> {
  if (storePromise) return storePromise;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  storePromise = url && token ? createRedisStore() : Promise.resolve(createInMemoryStore());
  return storePromise;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getCached(huntId: number): Promise<CachedAnalytics | null> {
  const store = await getStore();
  return store.get(huntId);
}

export async function setCached(huntId: number, value: CachedAnalytics): Promise<void> {
  const store = await getStore();
  await store.set(huntId, value, CACHE_TTL_SECONDS);
}

/**
 * Evict a hunt's cached analytics.
 * Call this immediately after any write to hunt_analytics for that huntId.
 */
export async function invalidate(huntId: number): Promise<void> {
  const store = await getStore();
  await store.del(huntId);
}
