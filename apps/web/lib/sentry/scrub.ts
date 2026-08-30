/**
 * Sentry PII / wallet-address scrubbing.
 *
 * Used in the `beforeSend` callback of every Sentry.init() call (client,
 * server, edge) so that no personal data or on-chain identifiers reach
 * the error-tracking service.
 *
 * Patterns scrubbed:
 *  - Stellar/Soroban public keys   (G…, C…, 56-char base32)
 *  - Ethereum-style addresses      (0x + 40 hex chars)
 *  - Email addresses
 *  - API keys / JWTs / Bearer tokens
 *  - Explicit key names ("email", "wallet", "address", "privateKey", etc.)
 */
import type { Event, EventHint } from '@sentry/nextjs';

// ---------------------------------------------------------------------------
// Regex patterns
// ---------------------------------------------------------------------------

/** Stellar G-account or C-contract address (56 uppercase base-32 chars). */
const STELLAR_ADDRESS_RE = /\bG[A-Z0-9]{55}\b/g;

/** Soroban contract addresses starting with C. */
const SOROBAN_CONTRACT_RE = /\bC[A-Z0-9]{55}\b/g;

/** Ethereum-style hex addresses. */
const ETH_ADDRESS_RE = /\b0x[0-9a-fA-F]{40}\b/g;

/** RFC-5321 email addresses. */
const EMAIL_RE = /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g;

/** Bearer tokens, JWTs, and long base64-ish strings (≥ 32 chars). */
const BEARER_TOKEN_RE = /Bearer\s+[A-Za-z0-9\-_=+/]{20,}/gi;

/** JWT three-part structure. */
const JWT_RE = /\beyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_+/=]+\b/g;

// ---------------------------------------------------------------------------
// Sensitive key names whose values must always be redacted.
// ---------------------------------------------------------------------------
const SENSITIVE_KEYS = new Set([
  'email',
  'wallet',
  'walletAddress',
  'wallet_address',
  'address',
  'publicKey',
  'public_key',
  'privateKey',
  'private_key',
  'secret',
  'authorization',
  'apiKey',
  'api_key',
  'jwt',
  'token',
  'pinata_jwt',
  'resend_api_key',
  'vapid_private_key',
  'database_url',
]);

const REDACTED = '[REDACTED]';

// ---------------------------------------------------------------------------
// String scrubbing
// ---------------------------------------------------------------------------

/**
 * Replace all PII patterns found within a string with [REDACTED].
 * Returns the scrubbed string (original returned unchanged if not a string).
 */
export function scrubString(value: string): string {
  return value
    .replace(STELLAR_ADDRESS_RE, REDACTED)
    .replace(SOROBAN_CONTRACT_RE, REDACTED)
    .replace(ETH_ADDRESS_RE, REDACTED)
    .replace(EMAIL_RE, REDACTED)
    .replace(BEARER_TOKEN_RE, REDACTED)
    .replace(JWT_RE, REDACTED);
}

// ---------------------------------------------------------------------------
// Deep object scrubbing
// ---------------------------------------------------------------------------

/**
 * Recursively walk an unknown value and redact sensitive data in-place.
 * Returns a new value (objects/arrays are cloned shallowly per level).
 */
export function scrubValue(value: unknown, depth = 0): unknown {
  // Avoid infinite loops on deeply nested or circular objects.
  if (depth > 10) return value;

  if (typeof value === 'string') {
    return scrubString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, depth + 1));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        result[k] = REDACTED;
      } else {
        result[k] = scrubValue(v, depth + 1);
      }
    }
    return result;
  }

  return value;
}

// ---------------------------------------------------------------------------
// Sentry beforeSend hook
// ---------------------------------------------------------------------------

/**
 * Sentry `beforeSend` callback.
 *
 * Scrubs all PII and wallet addresses from event messages, exception values,
 * breadcrumb data, request bodies/URLs, and extra context before the event is
 * transmitted.
 *
 * Returns `null` to drop the event entirely during testing so that no events
 * are sent when `NODE_ENV === "test"`.
 */
export function scrubSentryEvent(
  event: Event,
  // _hint is unused but must be present to match the Sentry callback signature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _hint?: EventHint
): Event | null {
  // Drop all events during automated tests — no noise in Sentry test project.
  if (process.env.NODE_ENV === 'test') return null;

  // Scrub exception values and stack frame filenames.
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((ex) => ({
      ...ex,
      value: ex.value ? scrubString(ex.value) : ex.value,
      stacktrace: ex.stacktrace
        ? {
            ...ex.stacktrace,
            frames: ex.stacktrace.frames?.map((frame) => ({
              ...frame,
              // Filename/abs_path may contain project paths with username dirs.
              filename: frame.filename ? scrubString(frame.filename) : frame.filename,
              abs_path: frame.abs_path ? scrubString(frame.abs_path) : frame.abs_path,
              // Local variables in stack frames can contain PII.
              vars: frame.vars ? (scrubValue(frame.vars) as typeof frame.vars) : frame.vars,
            })),
          }
        : ex.stacktrace,
    }));
  }

  // Scrub top-level message.
  if (event.message) {
    event.message = scrubString(event.message);
  }

  // Scrub breadcrumbs.
  if (event.breadcrumbs?.values) {
    event.breadcrumbs.values = event.breadcrumbs.values.map((crumb) => ({
      ...crumb,
      message: crumb.message ? scrubString(crumb.message) : crumb.message,
      data: crumb.data ? (scrubValue(crumb.data) as typeof crumb.data) : crumb.data,
    }));
  }

  // Scrub HTTP request data (URL query strings, body, headers).
  if (event.request) {
    if (event.request.url) {
      event.request.url = scrubString(event.request.url);
    }
    if (event.request.query_string) {
      event.request.query_string =
        typeof event.request.query_string === 'string'
          ? scrubString(event.request.query_string)
          : (scrubValue(event.request.query_string) as typeof event.request.query_string);
    }
    if (event.request.data) {
      event.request.data =
        typeof event.request.data === 'string'
          ? scrubString(event.request.data)
          : scrubValue(event.request.data);
    }
    if (event.request.headers) {
      // Always strip the Authorization header entirely.
      const { Authorization, authorization, ...safeHeaders } = event.request.headers as Record<
        string,
        string
      >;
      void Authorization;
      void authorization;
      event.request.headers = scrubValue(safeHeaders) as typeof event.request.headers;
    }
    if (event.request.cookies) {
      event.request.cookies = REDACTED;
    }
  }

  // Scrub extra / context data.
  if (event.extra) {
    event.extra = scrubValue(event.extra) as typeof event.extra;
  }
  if (event.contexts) {
    event.contexts = scrubValue(event.contexts) as typeof event.contexts;
  }

  // Scrub user data — keep only the non-identifying `id` field.
  if (event.user) {
    const { id } = event.user;
    event.user = id ? { id } : {};
  }

  return event;
}
