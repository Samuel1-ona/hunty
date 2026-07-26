/**
 * Error Tracking Abstraction Layer
 *
 * Provides a Sentry-compatible interface that:
 * - Uses Sentry when NEXT_PUBLIC_SENTRY_DSN is configured
 * - Falls back to the console logger when no DSN is set
 * - Scrubs PII (Stellar wallet addresses, email addresses) before any data leaves the app
 *
 * All Sentry imports are dynamic to avoid build failures when @sentry/nextjs is not installed.
 */

import * as logger from '@/lib/logger'

// ---------------------------------------------------------------------------
// PII Scrubbing
// ---------------------------------------------------------------------------

/** Matches Stellar public keys: 'G' followed by 55 base32 (A-Z, 2-7) characters */
const WALLET_REGEX = /\bG[A-Z2-7]{55}\b/g

/** Matches common email address formats */
const EMAIL_REGEX = /\b[\w.-]+@[\w.-]+\.\w{2,}\b/g

/**
 * Recursively scrub Personally Identifiable Information from a value before
 * it is sent to an external tracking service.
 *
 * - Stellar wallet addresses → '[WALLET_REDACTED]'
 * - Email addresses         → '[EMAIL_REDACTED]'
 */
export function scrubPII(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(WALLET_REGEX, '[WALLET_REDACTED]')
      .replace(EMAIL_REGEX, '[EMAIL_REDACTED]')
  }

  if (Array.isArray(value)) {
    return value.map(scrubPII)
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = scrubPII(v)
    }
    return result
  }

  return value
}

/** Scrub PII from a context record */
function scrubContext(
  context?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!context) return undefined
  return scrubPII(context) as Record<string, unknown>
}

/** Extract a safe, scrubbed message string from an unknown error */
function safeMessage(error: unknown): string {
  if (error instanceof Error) {
    return scrubPII(error.message) as string
  }
  return scrubPII(String(error)) as string
}

// ---------------------------------------------------------------------------
// ErrorScope type
// ---------------------------------------------------------------------------

export interface ErrorScope {
  setExtra(key: string, value: unknown): void
  setTag(key: string, value: string): void
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function hasDSN(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Capture an exception and forward it to Sentry (if configured) or the
 * console logger. PII is scrubbed from the error message and context before
 * anything leaves the process.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const cleanContext = scrubContext(context)

  if (hasDSN()) {
    // Dynamic import so the module can be imported even when @sentry/nextjs is
    // not installed (e.g. in unit tests that mock the module or in CI with no
    // package installed).
    import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.withScope((scope) => {
          if (cleanContext) {
            for (const [key, value] of Object.entries(cleanContext)) {
              scope.setExtra(key, value)
            }
          }
          Sentry.captureException(error)
        })
      })
      .catch(() => {
        // @sentry/nextjs not installed — fall through to logger
        logger.error('[ErrorTracking] captureException:', safeMessage(error), cleanContext)
      })
    return
  }

  logger.error('[ErrorTracking] captureException:', safeMessage(error), cleanContext)
}

/**
 * Capture a plain message with an optional severity level. PII in the message
 * and context is scrubbed before forwarding.
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>,
): void {
  const cleanMessage = scrubPII(message) as string
  const cleanContext = scrubContext(context)

  if (hasDSN()) {
    import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.withScope((scope) => {
          if (cleanContext) {
            for (const [key, value] of Object.entries(cleanContext)) {
              scope.setExtra(key, value)
            }
          }
          // Sentry uses 'warning' not 'warn'
          Sentry.captureMessage(cleanMessage, level === 'warning' ? 'warning' : level)
        })
      })
      .catch(() => {
        logMessage(level, cleanMessage, cleanContext)
      })
    return
  }

  logMessage(level, cleanMessage, cleanContext)
}

function logMessage(
  level: 'info' | 'warning' | 'error',
  message: string,
  context?: Record<string, unknown>,
): void {
  switch (level) {
    case 'error':
      logger.error('[ErrorTracking]', message, context)
      break
    case 'warning':
      logger.warn('[ErrorTracking]', message, context)
      break
    default:
      logger.info('[ErrorTracking]', message, context)
  }
}

/**
 * Associate a user with subsequent events. Pass `null` to clear the user
 * (e.g. on logout). The user `id` is kept but any other fields are scrubbed
 * for PII.
 */
export function setUser(
  user: { id: string; [key: string]: unknown } | null,
): void {
  if (hasDSN()) {
    import('@sentry/nextjs')
      .then((Sentry) => {
        if (user === null) {
          Sentry.setUser(null)
        } else {
          const { id, ...rest } = user
          Sentry.setUser({ id, ...(scrubPII(rest) as Record<string, unknown>) })
        }
      })
      .catch(() => {
        logger.debug('[ErrorTracking] setUser: Sentry not available')
      })
    return
  }

  logger.debug('[ErrorTracking] setUser:', user ? { id: user.id } : null)
}

/**
 * Run a callback with a temporary scope so that extra data / tags are only
 * attached to events captured within the callback.
 */
export function withScope(callback: (scope: ErrorScope) => void): void {
  if (hasDSN()) {
    import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.withScope((sentryScope) => {
          const adapter: ErrorScope = {
            setExtra: (key, value) => sentryScope.setExtra(key, scrubPII(value)),
            setTag: (key, value) =>
              sentryScope.setTag(key, scrubPII(value) as string),
          }
          callback(adapter)
        })
      })
      .catch(() => {
        // Fall back: run the callback with a no-op scope
        const noopScope: ErrorScope = {
          setExtra: () => undefined,
          setTag: () => undefined,
        }
        callback(noopScope)
      })
    return
  }

  // No DSN: run the callback with a no-op scope
  const noopScope: ErrorScope = {
    setExtra: () => undefined,
    setTag: () => undefined,
  }
  callback(noopScope)
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Initialise the error tracking system.
 *
 * - When NEXT_PUBLIC_SENTRY_DSN is set, initialises Sentry with the provided
 *   configuration and a beforeSend hook that scrubs PII.
 * - Always registers a global `unhandledrejection` listener on the client side
 *   so that unhandled promise rejections are captured.
 *
 * Call this from sentry.client.config.ts / sentry.server.config.ts /
 * sentry.edge.config.ts.
 */
export async function initErrorTracking(): Promise<void> {
  if (hasDSN()) {
    try {
      const Sentry = await import('@sentry/nextjs')

      const integrations: unknown[] = []
      // replayIntegration is only available in browser builds
      if (typeof Sentry.replayIntegration === 'function') {
        integrations.push(Sentry.replayIntegration())
      }

      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
        release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
        tracesSampleRate: parseFloat(
          process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
        ),
        integrations: integrations as Parameters<typeof Sentry.init>[0]['integrations'],
        beforeSend(event) {
          // Scrub PII from the event message
          if (event.message) {
            event.message = scrubPII(event.message) as string
          }

          // Scrub PII from exception values
          if (event.exception?.values) {
            for (const exc of event.exception.values) {
              if (exc.value) {
                exc.value = scrubPII(exc.value) as string
              }
            }
          }

          return event
        },
      })

      logger.info('[ErrorTracking] Sentry initialised')
    } catch {
      logger.warn(
        '[ErrorTracking] @sentry/nextjs not installed; using console fallback',
      )
    }
  } else {
    logger.info('[ErrorTracking] No DSN configured; using console fallback')
  }

  // Register a global unhandledrejection listener on the client side
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      captureException(event.reason, {
        type: 'unhandledrejection',
        promise: String(event.promise),
      })
    })
  }
}
