# Incident Runbook

## Overview

This runbook covers incident detection, response, and recovery for the Hunty platform. The monitoring system tracks API health, error rates, response times, and client-side Web Vitals.

---

## Monitoring Stack

| Component | Purpose | Endpoint |
|---|---|---|
| Health Check | Dependency & uptime status | `GET /api/health` |
| API Monitoring | Per-route metrics (count, errors, latency) | In-memory (resets on deploy) |
| Web Vitals | Client-side LCP, FID, CLS, INP, TTFB | Browser → configured endpoint |
| Alerts | Email, Slack, Discord dispatch | Configurable via env vars |

---

## Alert Channels

Configure alert channels with environment variables:

### Email
```
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_TO=ops@hunty.app
ALERT_EMAIL_FROM=monitoring@hunty.app
```

### Slack
```
ALERT_SLACK_ENABLED=true
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Discord
```
ALERT_DISCORD_ENABLED=true
ALERT_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## Alert Thresholds

| Metric | Warning | Critical |
|---|---|---|
| Error rate | > 3% | > 5% |
| P95 response time | > 1s | > 2s |
| Dependency health | degraded | unhealthy |
| Uptime check miss | 2 consecutive failures | 5 consecutive failures |

---

## Incident Response Levels

### SEV-1: Critical (Platform Down)
- **Symptoms**: Health check returns unhealthy, >5% error rate, core dependency unreachable
- **Response**: Immediate — on-call engineer within 15 minutes
- **Actions**:
  1. Acknowledge alert
  2. Check health endpoint: `GET /api/health`
  3. Check dependency status in response
  4. Verify environment variables and secrets
  5. Check recent deployments
  6. If Soroban RPC is down — switch to backup RPC endpoint
  7. If IPFS gateway is down — verify gateway URLs in `NEXT_PUBLIC_PINATA_GATEWAY`
  8. Escalate to infrastructure team if needed

### SEV-2: Degraded (Partial Outage)
- **Symptoms**: Elevated error rates (3-5%), slow responses (>1s P95), degraded dependency
- **Response**: Within 1 hour during business hours
- **Actions**:
  1. Review aggregated metrics from health endpoint
  2. Identify the specific route(s) with elevated errors
  3. Check for recent code changes affecting those routes
  4. Monitor error rate trend — if rising, upgrade to SEV-1
  5. Consider rolling back recent deployment

### SEV-3: Minor (Non-Critical)
- **Symptoms**: Isolated errors, individual user reports, slow non-critical endpoint
- **Response**: Next business day
- **Actions**:
  1. Log the issue in the project's issue tracker
  2. Tag with `incident` label
  3. Assign to appropriate team member

---

## Common Scenarios

### Scenario: High Error Rate on `/api/ipfs`
1. Check Pinata JWT token expiry — `PINATA_JWT` env var
2. Verify IPFS gateway is reachable
3. Check rate limit (10 req/hr per wallet) — may be legitimate throttling
4. Review recent upload patterns for abuse

### Scenario: Slow Hunt Queries (`/api/v1/hunts`)
1. Check Soroban RPC endpoint latency
2. Verify the indexer (Torii) is responsive
3. Check if pagination params are being used (`page`, `limit`)
4. Monitor `NEXT_PUBLIC_TORII_INDEXER_URL` for outages

### Scenario: Email Notifications Failing
1. Verify `RESEND_API_KEY` is set and valid
2. Check Resend service status
3. Verify `ALERT_EMAIL_TO` and `ALERT_EMAIL_FROM` are correct
4. Check sender domain configuration (SPF, DKIM)

---

## Recovery Procedures

### After an Incident
1. Ensure all services are healthy — run `GET /api/health`
2. Clear any degraded status by allowing metrics window to pass
3. Document the incident:
   - Root cause
   - Detection time
   - Response time
   - Resolution time
   - Preventative measures
4. Create a post-mortem issue in the project tracker
5. Update this runbook if new scenarios were discovered

### Deployment Rollback
```bash
git revert HEAD
git push origin main
```

After rollback, verify health endpoint returns healthy before marking incident resolved.

---

## Testing Alerts

Send a test alert to verify all configured channels work:

```bash
curl -X POST https://hunty.app/api/health/test-alert
```

Or from the admin panel (if available), click "Send Test Alert".

---

## Useful Commands

```bash
# Check health
curl https://hunty.app/api/health

# View recent error logs (production)
npm run logs -- --tail=100 --filter="[Monitoring]"

# Verify environment
npm run build:check
```

---

## Contacts

| Role | Name | Contact |
|---|---|---|
| On-call Engineer | TBD | TBD |
| Infrastructure Lead | TBD | TBD |
| DevOps | TBD | TBD |

---

## Revision History

| Date | Author | Changes |
|---|---|---|
| 2026-06-23 | Hunty Team | Initial runbook |
