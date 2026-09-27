/**
 * Breakpoint / Bottleneck Test
 * ----------------------------
 * Ramps VUs until the system breaks or thresholds breach.
 * Used to find the ceiling of the API before a release.
 *
 * ⚠️  Do NOT run against production without approval.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const errorRate = new Rate('error_rate');
const apiDuration = new Trend('api_duration', true);

export const options = {
  executor: 'ramping-arrival-rate',
  startRate: 10,
  timeUnit: '1s',
  preAllocatedVUs: 50,
  maxVUs: 500,
  stages: [
    { duration: '2m', target: 10 },   // warm up
    { duration: '5m', target: 50 },   // moderate
    { duration: '5m', target: 100 },  // high
    { duration: '5m', target: 200 },  // stress
    { duration: '5m', target: 300 },  // breakpoint search
  ],

  // Abort scenario if error rate climbs above 10%
  thresholds: {
    error_rate: [{ threshold: 'rate<0.10', abortOnFail: true }],
    http_req_duration: ['p(95)<500'], // relaxed for breakpoint testing
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/api/jobs?page=1&limit=20`, {
    tags: { endpoint: 'jobs_list' },
  });

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'duration < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!ok);
  apiDuration.add(res.timings.duration);

  sleep(0.1);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] ?? 'N/A';
  const p99 = data.metrics.http_req_duration?.values?.['p(99)'] ?? 'N/A';
  const errors = data.metrics.error_rate?.values?.rate ?? 'N/A';
  const rps = data.metrics.http_reqs?.values?.rate ?? 'N/A';

  console.log('\n🔍 Bottleneck Test Summary');
  console.log('══════════════════════════');
  console.log(`  p95 latency : ${p95} ms`);
  console.log(`  p99 latency : ${p99} ms`);
  console.log(`  Error rate  : ${(errors * 100).toFixed(2)}%`);
  console.log(`  Max RPS     : ${rps}`);

  return {};
}