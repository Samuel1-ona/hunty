import { NextResponse } from "next/server"

import { assertAdminAuth } from "./adminAuth"
import { AppError, AuthError, ForbiddenError, InternalError, isAppError } from "./errors"

type RouteHandler<Context, Req extends Request = Request> = (
  req: Req,
  context: Context
) => Promise<NextResponse> | NextResponse

/**
 * Identity established for the current request by `withAuth`.
 *
 * IMPORTANT — this is presence-based, not cryptographically verified.
 * Hunty does not currently have a real server-side session, JWT, or wallet
 * signature-challenge mechanism (`lib/session.ts` is a client-only
 * localStorage convenience; it proves nothing to the server). `identity`
 * is simply the wallet address the caller *claims* to be, read from
 * whichever ad hoc channel each route already relied on before this
 * wrapper existed (an `x-wallet-address` header, a `?wallet=`-style query
 * param, or a `wallet`/`ownerKey`/`playerAddress`/... field in the JSON
 * body).
 *
 * Centralizing this still buys real value:
 *   - one enforcement point instead of N slightly-different inline checks
 *     scattered across routes (some 400, some 401, some silently trusting
 *     the field)
 *   - a consistent 401 for "no identity presented" instead of ad hoc 400s
 *   - a single place to swap in real verification (Stellar signature
 *     challenge-response, a signed session cookie, etc.) later without
 *     touching every route again
 *   - a mechanical signal ("does this file call withAuth/withAdminAuth?")
 *     that the route-tree enumeration test can check
 *
 * It does NOT stop someone from claiming another wallet's address — that
 * requires real credential verification, which is tracked as follow-up
 * work (see PR description / issue #865 report).
 */
export interface AuthContext {
  identity: string
}

const IDENTITY_HEADER = "x-wallet-address"

/** Query-string parameter names already used across routes to carry identity. */
const IDENTITY_QUERY_PARAMS = ["wallet", "walletAddress", "ownerKey", "address"] as const

/** JSON body field names already used across routes to carry identity. */
const IDENTITY_BODY_FIELDS = [
  "wallet",
  "walletAddress",
  "ownerKey",
  "playerAddress",
  "actorAddress",
  "moderatorAddress",
] as const

async function extractIdentity(req: Request): Promise<string | null> {
  const header = req.headers.get(IDENTITY_HEADER)
  if (header && header.trim()) return header.trim()

  try {
    const url = new URL(req.url)
    for (const key of IDENTITY_QUERY_PARAMS) {
      const value = url.searchParams.get(key)
      if (value && value.trim()) return value.trim()
    }
  } catch {
    // Relative/invalid URL (can happen when handlers are invoked directly
    // in unit tests) — fall through to body inspection.
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      // Don't gate on a `content-type: application/json` header — several
      // real callers (and existing tests) POST a JSON string body without
      // setting it explicitly, and the route handlers themselves don't
      // require it either (they just call `req.json()`). Clone so the
      // downstream handler can still read the original body; if the body
      // isn't JSON (e.g. the multipart/form-data upload in /api/ipfs),
      // `.json()` throws and we simply fall through to "no identity".
      const body: unknown = await req.clone().json()
      if (body && typeof body === "object") {
        for (const key of IDENTITY_BODY_FIELDS) {
          const value = (body as Record<string, unknown>)[key]
          if (typeof value === "string" && value.trim()) return value.trim()
        }
      }
    } catch {
      // Malformed/empty/non-JSON body — the route's own body parsing
      // (inside the wrapped handler) will surface the appropriate
      // validation error.
    }
  }

  return null
}

/**
 * Wraps a route handler so it only runs for requests that carry *some*
 * caller identity (a wallet address), matching the ad hoc channels routes
 * already used: an `x-wallet-address` header, a `?wallet=`/`?ownerKey=`/...
 * query param, or a `wallet`/`ownerKey`/`playerAddress`/... JSON body
 * field.
 *
 * Throws `AuthError` (401) when no identity is present, which
 * `withErrorHandling` converts into the standard `{ error, code }` JSON
 * envelope.
 *
 * Compose *inside* `withErrorHandling`, same convention as `withAdminAuth`:
 *
 *   export const POST = withErrorHandling(withAuth(async (req, ctx, auth) => {
 *     // auth.identity is the caller's claimed wallet address
 *   }))
 */
export function withAuth<Context = unknown, Req extends Request = Request>(
  handler: (req: Req, context: Context, auth: AuthContext) => Promise<NextResponse> | NextResponse
): RouteHandler<Context, Req> {
  return async (req: Req, context: Context): Promise<NextResponse> => {
    const identity = await extractIdentity(req)
    if (!identity) {
      throw new AuthError("Authentication required: no wallet identity found on the request")
    }
    return handler(req, context, { identity })
  }
}

/**
 * Converts whatever `assertAdminAuth` throws into a proper `AppError` so it
 * carries the right HTTP status through `withErrorHandling`.
 *
 * `assertAdminAuth` throws a plain `Error` subclass (`AdminAuthError`) with
 * its own `status` field rather than an `AppError`. Previously, routes that
 * called `assertAdminAuth` directly inside `withErrorHandling` would have
 * that error fall through `errorResponse`'s `isAppError` check and get
 * reported as a generic 500 instead of the intended 401 — this wrapper
 * fixes that as part of centralizing admin auth.
 */
function toAdminAppError(err: unknown): AppError {
  if (isAppError(err)) return err
  if (err instanceof Error && "status" in err) {
    const status = (err as Error & { status?: number }).status
    if (status === 403) return new ForbiddenError(err.message)
    if (status && status >= 500) return new InternalError(err.message)
    return new AuthError(err.message)
  }
  return new InternalError("Admin authorization failed")
}

/**
 * Wraps a route handler so it only runs for requests carrying a valid admin
 * bearer token (see `assertAdminAuth` / `ADMIN_API_SECRET`). Rejects with
 * 401 when the token is missing/invalid (or the secret isn't configured in
 * a non-production environment).
 *
 * Usage:
 *   export const POST = withErrorHandling(withAdminAuth(async (req, ctx) => { ... }))
 */
export function withAdminAuth<Context = unknown, Req extends Request = Request>(
  handler: RouteHandler<Context, Req>
): RouteHandler<Context, Req> {
  return async (req: Req, context: Context): Promise<NextResponse> => {
    try {
      assertAdminAuth(req)
    } catch (err) {
      throw toAdminAppError(err)
    }
    return handler(req, context)
  }
}
