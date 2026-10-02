/**
 * Vitest stub for @upstash/redis.
 *
 * @upstash/redis is an optional runtime dependency that is only loaded when
 * UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars are present.
 * In the test environment those vars are absent and the package is not
 * installed, so Vite's import-analysis would fail on the dynamic
 *   `await import("@upstash/redis")`
 * inside lib/rate-limit.ts before any test code runs.
 *
 * This file is wired as an alias in vitest.config.ts so Vite resolves the
 * import to this stub instead of the real (absent) package.  The in-memory
 * store path in rate-limit.ts is always taken in tests because the env vars
 * are not set, so the Redis class here is never actually called — it only
 * needs to exist to satisfy the module graph.
 */

export class Redis {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async eval(..._args: unknown[]): Promise<[number, number]> {
    return [0, 0];
  }
}
