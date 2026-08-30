/**
 * Sentry Node.js (server-side) initialisation.
 * Loaded automatically by @sentry/nextjs via next.config.ts instrumentation.
 *
 * This file also registers the `unhandledRejection` handler so that any
 * Promise that rejects without a `.catch()` is forwarded to Sentry before
 * the process has a chance to swallow it silently.
 */
import * as Sentry from '@sentry/nextjs';

import { scrubSentryEvent } from '@/lib/sentry/scrub';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  release: process.env.NEXT_PUBLIC_APP_VERSION,

  environment: process.env.NEXT_PUBLIC_ENVIRONMENT ?? process.env.NODE_ENV,

  // Keep performance overhead low on the server.
  tracesSampleRate: 0.1,

  beforeSend: scrubSentryEvent,

  ignoreErrors: [
    // Next.js cancels in-flight requests on navigation — not a real error.
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
  ],
});

// ---------------------------------------------------------------------------
// Unhandled rejection handler (task #6)
// ---------------------------------------------------------------------------
// Next.js does not install its own unhandledRejection handler in app-router
// server components.  We attach one here so async errors that escape without
// a catch block still appear in Sentry rather than just in the process log.
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason: unknown) => {
    Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
      tags: { source: 'unhandledRejection' },
    });
  });
}
