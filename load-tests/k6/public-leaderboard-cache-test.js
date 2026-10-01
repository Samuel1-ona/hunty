/**
 * Public Leaderboard Cache Load Test
 * -----------------------------------
 * Verifies that GET /api/v1/hunts/:id/leaderboard/public
 *
 *   1. Returns Cache-Control: public, s-maxage=5, stale-while-revalidate=30
 *   2. Serves cached responses (Age header present) after the first hit
 *   3. Stays under p95 < 50 ms at 100 concurrent users (edge cache, not origin)
 *
 * Run:
 *   k6 run load-tests/k6/public-leaderboard-cache-test.js
 *
 * Against staging:
 *   BASE_URL=https://staging.hunty.app k6 run load-tests/k6/public-leaderboard-cache-test.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ─── Custom Metrics ────────────────────────────────────────────────────────────
const errorRate       = new Rate('error_rate');
const cacheHitRate    = new Rate('cache_hit_rate');
const originDuration  = new Trend('origin_duration_ms', true);   // cold / bypass
const cachedDuration  = new Trend('cached_duration_ms', true);   // warm CDN hit
const requestCount    = new Counter('request_count');

// ─── Config ────────────────────────────────────────────────────────────────────
const BASE_URL  = __ENV.BASE_URL  || 'http://localhost:3000';
const HUNT_IDS  = (__ENV.HUNT_IDS || '1,2,3').split(',').map(Number);

export const options = {
  scenarios: {
    // Warm-up: single VU to prime the cache
    warmup: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: HUNT_IDS.length,
      maxDuration: '30s',
      tags: { phase: 'warmup' },
    },

    // Sustained load: 100 VUs for 2 minutes — should all hit cache
    cached_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '2m',
      startTime: '35s',       // starts after warm-up finishes
      tags: { phase: 'cached_load' },
    },

    // Spike: 300 VUs for 30 s — CDN must absorb the burst
    spike: {
      executor: 'ramping-vus',
      startTime: '3m',
      startVUs: 0,
      stages: [
        { duration: '5s',  target: 300 },
        { duration: '25s', target: 300 },
        { duration: '5s',  target: 0   },
      ],
      tags: { phase: 'spike' },
    },
  },

  thresholds: {
    // Cached responses must be very fast (edge latency only)
    cached_duration_ms:  ['p(95)<50'],
    // Origin hits are slower but should still be reasonable
    origin_duration_ms:  ['p(95)<300'],
    // Overall error rate must be negligible
    error_rate:          ['rate<0.01'],
    // Cache hit rate during the cached_load phase must be high
    // (at least 80 % of responses should come from the edge)
    cache_hit_rate:      ['rate>0.80'],
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true when the response was served from a shared cache.
 * Checks the standard `Age` header (CDN sets this > 0 for cached responses)
 * and the common `X-Cache: HIT` header used by most CDNs / Varnish.
 */
function isCacheHit(res) {
  const age    = parseInt(res.headers['Age'] || res.headers['age'] || '0', 10);
  const xCache = (res.headers['X-Cache'] || res.headers['x-cache'] || '').toLowerCase();
  return age > 0 || xCache.includes('hit');
}

/**
 * Verify the Cache-Control header matches the required policy.
 */
function hasCacheControlHeader(res) {
  const cc = res.headers['Cache-Control'] || res.headers['cache-control'] || '';
  return cc.includes('s-maxage=5') && cc.includes('stale-while-revalidate=30');
}

// ─── Main VU function ─────────────────────────────────────────────────────────
export default function () {
  // Each VU picks a random hunt to spread load evenly across IDs
  const huntId = HUNT_IDS[Math.floor(Math.random() * HUNT_IDS.length)];
  const url    = `${BASE_URL}/api/v1/hunts/${huntId}/leaderboard/public`;

  group('public leaderboard cache', () => {
    const res = http.get(url, {
      tags: { endpoint: 'public_leaderboard', huntId: String(huntId) },
      // Do not follow redirects so we can inspect headers accurately
      redirects: 0,
    });

    // ── Correctness checks ──────────────────────────────────────────────────
    check(res, {
      'status is 200':                  (r) => r.status === 200,
      'Cache-Control header is correct': (r) => hasCacheControlHeader(r),
      'response has data array':         (r) => {
        try {
          const body = r.json();
          return Array.isArray(body?.data);
        } catch {
          return false;
        }
      },
      'huntId echoed in response': (r) => {
        try {
          return r.json('huntId') === huntId;
        } catch {
          return false;
        }
      },
    });

    // ── Metrics ─────────────────────────────────────────────────────────────
    const hit = isCacheHit(res);
    cacheHitRate.add(hit);
    errorRate.add(res.status !== 200);
    requestCount.add(1);

    if (hit) {
      cachedDuration.add(res.timings.duration, { huntId: String(huntId) });
    } else {
      originDuration.add(res.timings.duration, { huntId: String(huntId) });
    }
  });

  sleep(0.5);
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────
export function setup() {
  console.log(`🚀 Public leaderboard cache test → ${BASE_URL}`);
  console.log(`   Hunt IDs under test: ${HUNT_IDS.join(', ')}`);

  // Verify target is reachable
  const health = http.get(`${BASE_URL}/api/health`);
  if (health.status !== 200) {
    throw new Error(`Target unreachable: ${BASE_URL} returned ${health.status}`);
  }

  // Prime the cache for each hunt (warm-up scenario handles this too, but
  // doing it in setup() ensures at least one origin hit before VUs start)
  for (const id of HUNT_IDS) {
    const res = http.get(`${BASE_URL}/api/v1/hunts/${id}/leaderboard/public`);
    console.log(`  Primed hunt ${id}: HTTP ${res.status}, Cache-Control: ${res.headers['Cache-Control'] || 'not set'}`);
  }

  return { baseUrl: BASE_URL, huntIds: HUNT_IDS };
}

export function teardown(data) {
  console.log(`✅ Cache test complete for: ${data.baseUrl}`);
  console.log(`   Tested hunt IDs: ${data.huntIds.join(', ')}`);
}
