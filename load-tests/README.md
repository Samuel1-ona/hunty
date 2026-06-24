# Load Testing — hunty API

Load tests using [k6](https://k6.io/) covering the acceptance criteria for issue #667.

## Acceptance Criteria

- [x] k6 load test scripts
- [x] Scenarios: normal load, peak load, spike
- [x] API response time targets (p95 < 200ms)
- [x] Identify bottlenecks under load
- [x] Load test as part of release process (GitHub Actions)

---

## Structure

```
load-tests/
├── k6/
│   ├── load-test.js       # Main suite: normal + peak + spike scenarios
│   ├── smoke-test.js      # Quick sanity check (1 VU, 1 min)
│   └── bottleneck-test.js # Ramps until system breaks
└── .github/
    └── workflows/
        └── load-tests.yml # CI/CD integration
```

---

## Prerequisites

Install k6: https://k6.io/docs/get-started/installation/

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

---

## Running Locally

```bash
# Set your target (defaults to localhost:3000)
export BASE_URL=http://localhost:3000
export TEST_EMAIL=loadtest@example.com
export TEST_PASSWORD=loadtest123

# 1. Smoke test first (always)
k6 run load-tests/k6/smoke-test.js

# 2. Full load test (normal + peak + spike — ~20 minutes)
k6 run load-tests/k6/load-test.js

# 3. Bottleneck test (find the breaking point)
k6 run load-tests/k6/bottleneck-test.js
```

### Against staging

```bash
BASE_URL=https://staging.hunty.app k6 run load-tests/k6/load-test.js
```

---

## Scenarios

| Scenario     | VUs      | Duration | Purpose                        |
|--------------|----------|----------|--------------------------------|
| Normal load  | 20       | 5 min    | Typical daily traffic          |
| Peak load    | 100      | 6 min    | High-traffic periods           |
| Spike        | 200      | ~1.5 min | Sudden burst (viral event etc) |
| Bottleneck   | up to 300| ~22 min  | Find the breaking point        |

---

## Thresholds

| Metric        | Target   |
|---------------|----------|
| p95 latency   | < 200ms  |
| p99 latency   | < 500ms  |
| Error rate    | < 1%     |

---

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/load-tests.yml`) runs automatically:

- On every `release` published
- On every push to `release/**` or `rc/**` branches
- Manually via **Actions → Load Tests → Run workflow**

The workflow:
1. Runs the smoke test first
2. Runs the full load test suite only if smoke passes
3. Checks that p95 < 200ms and fails the build if not
4. Posts a summary table to the release/PR

### Required Secrets

Add these in **Settings → Secrets → Actions**:

| Secret              | Description                   |
|---------------------|-------------------------------|
| `LOAD_TEST_EMAIL`   | Test account email            |
| `LOAD_TEST_PASSWORD`| Test account password         |

### Required Variables

| Variable       | Description                        |
|----------------|------------------------------------|
| `STAGING_URL`  | Staging base URL (fallback default)|

---

## Interpreting Results

k6 prints a summary after each run. Key fields:

```
http_req_duration.....: avg=45ms  min=12ms  med=38ms  max=850ms  p(90)=120ms p(95)=175ms p(99)=420ms
http_req_failed.......: 0.00%
```

- **p(95) must be < 200ms** — this is the release gate
- High p(99) with low p(95) → isolated slow requests, investigate specific endpoints
- Rising error rate → server is overloaded, scale or optimise before release