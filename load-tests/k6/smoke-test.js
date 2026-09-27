/**
 * Smoke Test
 * ---------
 * A minimal run (1 VU, 1 min) to verify the system works before
 * running heavier scenarios. Run this before every load test.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // List all hunts
  const hunts = http.get(`${BASE_URL}/api/v1/hunts`);
  check(hunts, { 'hunts ok': (r) => r.status === 200 });
  sleep(1);

  // Get hunt by real ID
  const hunt = http.get(`${BASE_URL}/api/v1/hunts/1`);
  check(hunt, { 'hunt by id ok': (r) => r.status === 200 });
  sleep(1);

  // Leaderboard for hunt 1
  const leaderboard = http.get(`${BASE_URL}/api/v1/hunts/1/leaderboard`);
  check(leaderboard, { 'leaderboard ok': (r) => r.status === 200 || r.status === 401 });
  sleep(1);

  // Featured hunts
  const featured = http.get(`${BASE_URL}/api/admin/featured`);
  check(featured, { 'featured ok': (r) => r.status === 200 || r.status === 401 });
  sleep(1);
}