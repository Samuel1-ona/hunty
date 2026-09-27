/**
 * Sentry Edge runtime initialisation (middleware, edge API routes).
 * Loaded automatically by @sentry/nextjs via next.config.ts instrumentation.
 */
import * as Sentry from "@sentry/nextjs"

import { scrubSentryEvent } from "@/lib/sentry/scrub"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  release: process.env.NEXT_PUBLIC_APP_VERSION,

  environment: process.env.NEXT_PUBLIC_ENVIRONMENT ?? process.env.NODE_ENV,

  // Edge functions are very latency-sensitive; keep sampling conservative.
  tracesSampleRate: 0.05,

  beforeSend: scrubSentryEvent,
})
