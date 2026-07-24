# Mobile Analytics — Privacy & Implementation Guide

## Overview

Hunty mobile analytics is built on **Sentry** with a privacy-first architecture:
- No PII collected without explicit consent
- IP anonymization enabled by default
- All data scrubbed before transmission
- Full opt-out mechanism via AsyncStorage

## Data Collection Policy

| Data Type | Collected | Notes |
|-----------|-----------|-------|
| Screen views | ✅ | Route name only (e.g. `/hunt/123`) |
| User actions | ✅ | Action name + target element (no text content) |
| Performance | ✅ | Duration ms, cold/warm start flag |
| Crash reports | ✅ | Stack trace + device context |
| Wallet address | ✅ | Used as anonymized user ID |
| IP address | ❌ | Anonymized by Sentry |
| Email / phone | ❌ | Explicitly scrubbed |
| Location | ❌ | Not collected by analytics |
| Private keys | ❌ | Scrubbed from all breadcrumbs |

## Opt-Out

Users can opt out at any time. When opted out:
- Sentry client is closed
- All events are dropped silently
- Status persists across app restarts (AsyncStorage)

```tsx
const { disableAnalytics, enableAnalytics, isOptedOut } = useAnalytics();

&lt;Toggle value={!isOptedOut} onValueChange={(v) =&gt; v ? enableAnalytics() : disableAnalytics()} /&gt;