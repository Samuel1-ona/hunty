import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ─── Custom Metrics ────────────────────────────────────────────────────────────
const errorRate = new Rate('error_rate');
const apiDuration = new Trend('api_duration', true);
const requestCount = new Counter('request_count');

// ─── Configuration ─────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// ─── Thresholds (p95 < 200ms) ─────────────────────────────────────────────────
export const options = {
  scenarios: {
    // 1. Normal Load — steady everyday traffic
    normal_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },   // ramp up
        { duration: '3m', target: 20 },   // hold steady
        { duration: '1m', target: 0 },    // ramp down
      ],
      tags: { scenario: 'normal_load' },
      gracefulRampDown: '30s',
    },

    // 2. Peak Load — high-traffic periods
    peak_load: {
      executor: 'ramping-vus',
      startTime: '6m',                    // starts after normal load
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },  // aggressive ramp
        { duration: '3m', target: 100 },  // sustain peak
        { duration: '1m', target: 0 },    // cool down
      ],
      tags: { scenario: 'peak_load' },
      gracefulRampDown: '30s',
    },

    // 3. Spike — sudden burst of traffic
    spike: {
      executor: 'ramping-vus',
      startTime: '13m',                   // starts after peak load
      startVUs: 0,
      stages: [
        { duration: '10s', target: 200 }, // instant spike
        { duration: '1m', target: 200 },  // hold spike
        { duration: '10s', target: 0 },   // drop off
      ],
      tags: { scenario: 'spike' },
      gracefulRampDown: '30s',
    },
  },

  thresholds: {
    // ✅ Acceptance Criteria: p95 < 200ms
    http_req_duration: ['p(95)<200'],
    // Keep error rate below 1%
    error_rate: ['rate<0.01'],
    // 99th percentile under 500ms
    http_req_duration: ['p(99)<500', 'p(95)<200'],
  },
};

// ─── Helper: Auth Headers ──────────────────────────────────────────────────────
function getHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
}

// ─── Auth Flow ─────────────────────────────────────────────────────────────────
function login() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: __ENV.TEST_EMAIL || 'loadtest@example.com',
      password: __ENV.TEST_PASSWORD || 'loadtest123',
    }),
    { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'auth_login' } }
  );

  check(res, { 'login: status 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  apiDuration.add(res.timings.duration, { endpoint: 'auth_login' });
  requestCount.add(1);

  try {
    return res.json('token') || res.json('accessToken') || null;
  } catch {
    return null;
  }
}

// ─── API Endpoint Tests ────────────────────────────────────────────────────────
function testPublicEndpoints() {
  group('Public Endpoints', () => {
    // Health check
    const health = http.get(`${BASE_URL}/api/health`, {
      tags: { endpoint: 'health' },
    });
    check(health, { 'health: status 200': (r) => r.status === 200 });
    errorRate.add(health.status !== 200);
    apiDuration.add(health.timings.duration, { endpoint: 'health' });
    requestCount.add(1);
    sleep(0.1);

    // List jobs / bounties (public)
    const listings = http.get(`${BASE_URL}/api/jobs?page=1&limit=20`, {
      tags: { endpoint: 'jobs_list' },
    });
    check(listings, {
      'jobs list: status 200': (r) => r.status === 200,
      'jobs list: has data': (r) => r.body && r.body.length > 0,
    });
    errorRate.add(listings.status !== 200);
    apiDuration.add(listings.timings.duration, { endpoint: 'jobs_list' });
    requestCount.add(1);
    sleep(0.2);
  });
}

function testAuthenticatedEndpoints(token) {
  if (!token) return;

  const headers = getHeaders(token);

  group('Authenticated Endpoints', () => {
    // User profile
    const profile = http.get(`${BASE_URL}/api/user/profile`, {
      headers,
      tags: { endpoint: 'user_profile' },
    });
    check(profile, { 'profile: status 200': (r) => r.status === 200 });
    errorRate.add(profile.status !== 200);
    apiDuration.add(profile.timings.duration, { endpoint: 'user_profile' });
    requestCount.add(1);
    sleep(0.1);

    // Leaderboard
    const leaderboard = http.get(`${BASE_URL}/api/leaderboard`, {
      headers,
      tags: { endpoint: 'leaderboard' },
    });
    check(leaderboard, { 'leaderboard: status 200': (r) => r.status === 200 });
    errorRate.add(leaderboard.status !== 200);
    apiDuration.add(leaderboard.timings.duration, { endpoint: 'leaderboard' });
    requestCount.add(1);
    sleep(0.1);

    // Achievements
    const achievements = http.get(`${BASE_URL}/api/achievements`, {
      headers,
      tags: { endpoint: 'achievements' },
    });
    check(achievements, { 'achievements: status 200': (r) => r.status === 200 });
    errorRate.add(achievements.status !== 200);
    apiDuration.add(achievements.timings.duration, { endpoint: 'achievements' });
    requestCount.add(1);
    sleep(0.2);
  });
}

// ─── Default Function (runs per VU iteration) ──────────────────────────────────
export default function () {
  const token = login();
  sleep(0.5);

  testPublicEndpoints();
  testAuthenticatedEndpoints(token);

  sleep(1);
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────
export function setup() {
  console.log(`🚀 Starting load tests against: ${BASE_URL}`);
  // Verify the target is reachable before running
  const res = http.get(`${BASE_URL}/api/health`);
  if (res.status !== 200) {
    throw new Error(`Target ${BASE_URL} is not reachable. Got status: ${res.status}`);
  }
  return { baseUrl: BASE_URL };
}

export function teardown(data) {
  console.log(`✅ Load tests complete for: ${data.baseUrl}`);
}