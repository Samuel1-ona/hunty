/**
 * Explicit registry of API route files that are intentionally public — no
 * `withAuth`/`withAdminAuth` is required to call any handler they export.
 *
 * This is the single source of truth `tests/api_route_auth.test.ts` uses to
 * tell "reviewed and intended to be public" apart from "nobody wired this
 * up yet". A route file on disk must EITHER appear here OR reference
 * `withAuth(`/`withAdminAuth(` somewhere in its source — anything else
 * fails CI. That is what makes "closed by default" real: a newly added
 * `route.ts` that nobody remembered to protect shows up in neither bucket,
 * and the enumeration test fails the build instead of silently shipping an
 * open endpoint.
 *
 * A file that exports a mix of public and protected methods (e.g. a public
 * GET alongside an auth-gated POST) does NOT need to be listed here — it
 * already references `withAuth(`/`withAdminAuth(` for the protected
 * export, which satisfies the test. Only list files that are wholly public
 * (no method requires auth).
 *
 * Paths are relative to `apps/web/app/api/`, matching the on-disk route
 * file (including the `route.ts`/`route.tsx` suffix), using forward
 * slashes.
 *
 * When adding a new route:
 *   - If it should be reachable by anyone, add it here and say why below.
 *   - Otherwise wrap its handler(s) in `withAuth` or `withAdminAuth`.
 */
export const PUBLIC_API_ROUTES: readonly string[] = [
  // ── Analytics: anonymous, aggregate, or fire-and-forget tracking ───────
  "analytics/hunt-view/route.ts", // view counters — no PII, safe to expose
  "analytics/performance/route.ts", // client web-vitals telemetry

  // ── Infra / platform ─────────────────────────────────────────────────
  "csp-report/route.ts", // browsers POST here automatically; can't carry auth
  "health/route.ts", // uptime/health check

  // ── Embeds & OG images: designed to be fetched by anyone/anything ──────
  "embed/[id]/route.ts",
  "og/hunt/[id]/route.ts",
  "og/hunt/[id]/route.tsx", // pre-existing duplicate of the above; out of scope for #865
  "og/leaderboard/route.ts",

  // ── Moderation: known gaps, tracked as follow-up (not silently open) ───
  // TODO(security follow-up): moderation/submit has no ownership check on
  // the submitted hunt payload; moderation/sync's GET discloses creator
  // notifications to anyone who supplies a matching `email` query param
  // and its POST marks notifications read by guessable ID (IDOR). Both are
  // pre-existing gaps this issue's identity-presence model can't safely
  // close without breaking their real callers (neither sends any
  // wallet-like identity today — see PR report for details). Left public
  // and flagged rather than silently covered.
  "moderation/submit/route.ts",
  "moderation/sync/route.ts",

  // ── Notifications ────────────────────────────────────────────────────
  // TODO(follow-up): no rate limit either — could be used to spam
  // arbitrary email addresses. Tracked separately from authZ centralization.
  "notifications/complete/route.tsx",

  // ── Push: genuinely called directly from the browser with no identity/
  //     secret today (see lib/notifications/notificationService.ts and
  //     lib/hooks/useHuntMutations.ts) — gating this behind withAdminAuth
  //     would 401 every real caller and break opt-in push notifications.
  //     Left public + rate-limited; real fix is a follow-up (see route
  //     file docstring). ───────────────────────────────────────────────
  "push/send/route.ts",

  // ── v1: public read surface of the product (hunt discovery, gameplay
  //     leaderboards, ratings) — all pre-existing "no auth needed" reads ──
  "v1/feature-flags/route.ts",
  "v1/hunts/route.ts",
  "v1/hunts/id/route.ts", // legacy/duplicate of v1/hunts/[id]; out of scope for #865
  "v1/hunts/[id]/route.ts",
  "v1/hunts/[id]/leaderboard/route.ts",
  "v1/hunts/[id]/leaderboard/public/route.ts",
  "v1/hunts/[id]/players/route.ts",
  "v1/hunts/[id]/ratings/route.ts",
  "v1/seasons/archived/route.ts",
  "v1/tags/route.ts",
  "v1/time/route.ts",

  // ── Paymaster: public eligibility lookup (no secret data, analogous to
  //     checking any public on-chain balance) ─────────────────────────────
  "paymaster/budget/[wallet]/route.ts",
]
