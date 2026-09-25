# Load Testing — hunty API

Load tests use [k6](https://k6.io/) to exercise the public API. The focused
leaderboard scenario is the current performance gate for high-volume read
paths.

## Leaderboard read scenario

`k6/leaderboard-read-test.js` exercises the route used by the web client:

```text
GET /api/v1/hunts/{HUNT_ID}/leaderboard?limit=100
```

The scenario uses a constant arrival rate of **1 request/second for 5 minutes**
(60 requests/minute), below the route's documented 100 requests/minute/IP rate
limit. Choose a stable staging hunt with representative progress data; an empty
leaderboard measures the empty-list path rather than the highest-volume read
path.

### Targets

| Metric                |    Target |
| --------------------- | --------: |
| p95 latency           | `< 200ms` |
| p99 latency           | `< 500ms` |
| HTTP/check error rate |    `< 1%` |

The thresholds are applied to requests tagged `endpoint:leaderboard`, so the
health probe used during setup is not included in the leaderboard percentiles.

## Structure

```text
load-tests/
├── README.md
└── k6/
    ├── leaderboard-read-test.js # Public leaderboard read gate
    ├── load-test.js             # Legacy broad suite; route coverage needs repair
    ├── smoke-test.js            # Quick multi-route sanity check
    └── bottleneck-test.js       # Legacy exploratory ramp
.github/workflows/load-tests.yml # On-demand staging workflow
```

## Prerequisites

Install k6 using the [official installation guide](https://k6.io/docs/get-started/installation/).
The focused scenario does not require test-account credentials because the
leaderboard endpoint is public.

## Running locally

Start the web app and choose a hunt that exists in the local dataset:

```bash
export BASE_URL=http://localhost:3000
export HUNT_ID=1

# Validate the script and run the five-minute profile.
k6 inspect load-tests/k6/leaderboard-read-test.js
k6 run load-tests/k6/leaderboard-read-test.js
```

For a fast one-request check, use k6's `--once` mode when it is available in
your installed version:

```bash
BASE_URL=http://localhost:3000 HUNT_ID=1 \
  k6 run --once load-tests/k6/leaderboard-read-test.js
```

The older `load-test.js`, `smoke-test.js`, and `bottleneck-test.js` files are
retained for historical/manual investigation. They reference routes that are
not all part of the current API and are not used by the leaderboard gate.

## Staging workflow

The `Leaderboard Load Test` workflow is intentionally **on demand** so a
shared GitHub-hosted runner does not create unattended production-like traffic.
To run it:

1. Open **Actions → Leaderboard Load Test → Run workflow**.
2. Provide a stable, populated `hunt_id` in the staging environment.
3. The workflow uses `vars.STAGING_URL` when configured, otherwise
   `https://staging.hunty.app`.
4. The job runs in the protected `staging` GitHub environment and fails on a
   threshold breach, non-200 response, or invalid response shape.

The workflow requires no account secrets and does not target production. A
nightly schedule can be added after staging availability, hunt fixture
persistence, and the shared-runner rate-limit budget have been confirmed.

## Interpreting results

k6 prints request percentiles and threshold results at the end of the run:

```text
http_req_duration{endpoint:leaderboard}: p(95)=... p(99)=...
http_req_failed{endpoint:leaderboard}: rate=...
leaderboard_checks: rate=...
```

A passing run has p95 below 200 ms, p99 below 500 ms, and fewer than 1% failed
or invalid leaderboard reads. A high p99 with a passing p95 usually indicates
isolated slow requests; rising errors or latency warrant investigating the
staging deployment and representative hunt data before changing the target.
