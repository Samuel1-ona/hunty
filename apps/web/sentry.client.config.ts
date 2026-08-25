/**
 * Sentry browser (client-side) initialisation.
 * Loaded automatically by @sentry/nextjs via next.config.ts instrumentation.
 *
 * Environment variables:
 *   NEXT_PUBLIC_SENTRY_DSN  – public DSN (required in prod, safe to commit as placeholder)
 *   NEXT_PUBLIC_APP_VERSION – release identifier forwarded to Sentry
 */
import * as Sentry from "@sentry/nextjs"

import { scrubSentryEvent } from "@/lib/sentry/scrub"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Release is injected by withSentryConfig during build; fallback to env var.
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  environment: process.env.NEXT_PUBLIC_ENVIRONMENT ?? process.env.NODE_ENV,

  // Capture 10 % of transactions for performance monitoring.
  // Increase toward 1.0 only if you need dense trace data.
  tracesSampleRate: 0.1,

  // Replay 1 % of sessions, 100 % of sessions with an error.
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and inputs by default so PII never reaches Sentry.
      maskAllText: true,
      blockAllMedia: false,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Remove PII and wallet addresses before every event leaves the browser.
  beforeSend: scrubSentryEvent,

  // Ignore well-known noise that produces no actionable signal.
  ignoreErrors: [
    // Browser extensions and user-initiated navigation.
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Network errors that are not bugs in our code.
    "Failed to fetch",
    "NetworkError when attempting to fetch resource",
    "Load failed",
    // Safari quirk.
    "Non-Error promise rejection captured with value: undefined",
  ],
})
