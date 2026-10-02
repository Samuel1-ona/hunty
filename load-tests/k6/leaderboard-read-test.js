import { check } from "k6";
import http from "k6/http";
import { Rate } from "k6/metrics";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const HUNT_ID = (__ENV.HUNT_ID || "").trim();
const leaderboardChecks = new Rate("leaderboard_checks");

export const options = {
  scenarios: {
    leaderboard_reads: {
      executor: "constant-arrival-rate",
      rate: 1,
      timeUnit: "1s",
      duration: "5m",
      preAllocatedVUs: 2,
      maxVUs: 10,
      tags: { endpoint: "leaderboard" },
    },
  },
  thresholds: {
    "http_req_duration{endpoint:leaderboard}": ["p(95)<200", "p(99)<500"],
    "http_req_failed{endpoint:leaderboard}": ["rate<0.01"],
    leaderboard_checks: ["rate>0.99"],
  },
};

export function setup() {
  if (!/^[1-9][0-9]*$/.test(HUNT_ID)) {
    throw new Error("HUNT_ID must be a positive integer");
  }

  const health = http.get(`${BASE_URL}/api/health`, {
    tags: { endpoint: "setup_health" },
  });
  if (health.status !== 200) {
    throw new Error(`Target health check failed with status ${health.status}`);
  }

  return { baseUrl: BASE_URL, huntId: HUNT_ID };
}

export default function (data) {
  const response = http.get(
    `${data.baseUrl}/api/v1/hunts/${encodeURIComponent(data.huntId)}/leaderboard?limit=100`,
    { tags: { endpoint: "leaderboard", operation: "read" } }
  );

  let payload = null;
  try {
    payload = response.json();
  } catch (_) {
    payload = null;
  }

  const hasData = payload !== null && Array.isArray(payload.data);
  const hasPagination =
    payload !== null && payload.pagination !== null && typeof payload.pagination === "object";
  const isValid = response.status === 200 && hasData && hasPagination;

  leaderboardChecks.add(isValid);
  check(response, {
    "leaderboard: status 200": (result) => result.status === 200,
    "leaderboard: data array": () => hasData,
    "leaderboard: pagination object": () => hasPagination,
  });
}

export function teardown(data) {
  console.log(`Leaderboard load test complete for hunt ${data.huntId} at ${data.baseUrl}.`);
}
