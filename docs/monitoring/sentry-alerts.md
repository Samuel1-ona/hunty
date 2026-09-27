# Sentry Alerting Rules

This document describes the recommended Sentry alert configuration for the Hunty web app.
Set these up in **Sentry → Alerts → Create Alert** after the DSN is configured.

---

## 1. Error-Rate Spike Alert (critical)

| Field | Value |
|---|---|
| **Name** | `[hunty-web] Error rate spike` |
| **Trigger type** | Metric alert — Number of errors |
| **Query filter** | `(none)` — all errors |
| **Time window** | 5 minutes |
| **Warning threshold** | 50 errors |
| **Critical threshold** | 200 errors |
| **Resolve threshold** | Below warning for 5 minutes |
| **Notification** | Slack `#alerts-production` + email on-call list |

Rationale: a spike above 200 errors in 5 minutes indicates a regression or
infrastructure failure that needs immediate attention.

---

## 2. New Issue Alert

| Field | Value |
|---|---|
| **Name** | `[hunty-web] New issue` |
| **Trigger type** | Issue alert — A new issue is created |
| **Environment** | `production` |
| **Notification** | Slack `#dev-errors` |

Ensures every novel error category is triaged, not just spikes.

---

## 3. Regression Alert

| Field | Value |
|---|---|
| **Name** | `[hunty-web] Regression detected` |
|**Trigger type** | Issue alert — A resolved issue re-occurs |
| **Environment** | `production` |
| **Notification** | Slack `#dev-errors` + assigned owner |

---

## 4. Admin Auth Failure Spike

| Field | Value |
|---|---|
| **Name** | `[hunty-web] Admin auth failures` |
| **Trigger type** | Metric alert — Number of events |
| **Query filter** | `tags[source]:adminAuth` |
| **Time window** | 10 minutes |
| **Critical threshold** | 10 events |
| **Notification** | Email security team |

Catches brute-force probing of the `/api/admin/*` endpoints.

---

## 5. Performance — P95 Response Time

| Field | Value |
|---|---|
| **Name** | `[hunty-web] P95 latency degraded` |
| **Trigger type** | Metric alert — Transaction duration (p95) |
| **Query filter** | `transaction.op:http.server` |
| **Time window** | 10 minutes |
| **Warning threshold** | 1000 ms |
| **Critical threshold** | 2000 ms |
| **Notification** | Slack `#alerts-production` |

---

## Notification channels to configure

1. **Slack** — add the Sentry Slack app to your workspace and connect the
   webhook in Sentry → Settings → Integrations → Slack.
2. **Email** — add team members under Sentry → Settings → Members, then
   reference their addresses in each alert's "Send notification to" field.
3. **PagerDuty** (optional) — integrate for SEV-1 escalation via
   Sentry → Settings → Integrations → PagerDuty.

---

## Testing alerts locally

You can trigger a test event from your app with:

```ts
import * as Sentry from "@sentry/nextjs"
Sentry.captureException(new Error("Test error from Hunty"))
```

Or from the Sentry UI: **Alerts → <alert name> → Send Test Notification**.
