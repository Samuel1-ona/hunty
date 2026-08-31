import { describe, it, expect, vi } from "vitest"
import fs from "fs"
import path from "path"

/**
 * Table-driven API route contract test.
 *
 * Every route under app/api/ must have a manifest entry.  The filesystem
 * scan detects new routes that haven't been registered yet, failing CI
 * until the manifest is updated.
 *
 * For each route the test asserts:
 *  1. It is explicitly classified as "admin" or "public".
 *  2. POST routes reject a malformed body with 4xx (typically 400).
 */

// ── Minimal mocks for infrastructure that blocks body validation ────────
// Some routes initialise DB / third-party clients *before* parsing the
// body.  Mock those so the JSON parse path is reachable.

vi.mock("@/lib/db", () => ({
  getDb: () => new Proxy({}, { get: () => async () => [] }),
}))

vi.mock("@/lib/db/queryOptimizer", () => ({
  listPublicActiveHuntsByCursorOptimized: () => ({ data: [], nextCursor: null, total: 0 }),
}))

vi.mock("@/lib/antiCheatDb", () => ({
  getConfig: async () => ({
    maxSubmissionsPerWindow: 10,
    submissionWindowMs: 60_000,
    minIntervalMs: 1_000,
    anomalyThreshold: 5,
    banDurationMs: 86_400_000,
  }),
  setConfig: vi.fn(),
  getFlaggedUsers: async () => [],
  getAnomalyHistory: async () => [],
  getSubmissionHistory: async () => [],
  getBannedUsers: async () => [],
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  isBanned: async () => false,
  verifyAnswer: async () => false,
  detectAnomalies: async () => [],
  calculateScore: async () => ({ score: 0, bonusPoints: 0 }),
  recordAnswer: vi.fn(),
  trackClueSubmission: vi.fn(),
  checkMinInterval: async () => ({ allowed: true, waitMs: 0 }),
}))

vi.mock("resend", () => {
  return {
    Resend: class {
      emails = { send: vi.fn() }
    },
  }
})

vi.mock("@/lib/featuredHuntDb", () => ({
  readFeaturedId: async () => null,
  writeFeaturedId: vi.fn(),
}))

vi.mock("@/lib/huntStore", () => ({
  getAllHunts: () => [],
  getHuntById: () => null,
  getAllHuntsIncludingPrivate: () => [],
  updateHuntStatus: vi.fn(),
  SEED_HUNTS: [],
  hideHuntsFromPublic: vi.fn(),
  unhideHuntsFromPublic: vi.fn(),
  softDeleteHunts: vi.fn(),
  restoreHunts: vi.fn(),
  permanentDeleteHunts: vi.fn(),
}))

vi.mock("@/lib/huntScheduling", () => ({
  applyHuntScheduleTransitions: (hunts: unknown[]) => hunts,
  getReminderCandidates: () => [],
}))

vi.mock("@/lib/reviews", () => ({
  readReviews: async () => [],
  writeReviews: vi.fn(),
  readCompletions: async () => ({}),
  writeCompletions: vi.fn(),
}))

vi.mock("@/lib/moderation/dbStore", () => ({
  getAllSubmissions: async () => [],
  getPendingSubmissions: async () => [],
  approveSubmission: vi.fn(),
  rejectSubmission: vi.fn(),
  flagContentPolicyViolation: vi.fn(),
  submitHuntForModeration: vi.fn(),
  getCreatorNotifications: async () => [],
  getModerationStatusForHunts: async () => ({}),
  markNotificationRead: async () => true,
}))

vi.mock("@/lib/moderation/email", () => ({
  sendModerationActionEmail: vi.fn(),
}))

vi.mock("@/lib/notifications/pushService", () => ({
  notifyWallet: vi.fn(),
  notifyWallets: vi.fn(),
}))

vi.mock("@/lib/notifications/huntScheduleNotifications", () => ({
  sendHuntStartReminder: vi.fn(),
}))

vi.mock("@/components/emails/HuntCompletionEmail", () => ({
  HuntCompletionEmail: () => null,
}))

vi.mock("@/lib/server/seedClues", () => ({
  getServerClue: () => null,
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureEvent: vi.fn(),
}))

interface RouteEntry {
  /** Filesystem path relative to app/api/, e.g. "admin/moderation/route.ts" */
  file: string
  /** API path the route responds to, e.g. "/api/admin/moderation" */
  path: string
  /** HTTP methods exported by the module */
  methods: string[]
  /** Auth requirement – every route MUST be one of these */
  auth: "admin" | "public"
  /** If true, the POST/PUT/PATCH handler does not parse a JSON body
   *  (cron endpoint, formData, text body, etc.) and body validation is skipped. */
  noBody?: boolean
}

// ──────────────────────────────────────────────────────────────────────────
//  MANIFEST – the single source of truth.
//
//  When you add a new route file, add an entry here or the filesystem
//  completeness check will fail CI.
// ──────────────────────────────────────────────────────────────────────────

const ROUTE_MANIFEST: RouteEntry[] = [
  // ── admin ────────────────────────────────────────────────────────────
  { file: "admin/anti-cheat/route.ts",              path: "/api/admin/anti-cheat",              methods: ["GET", "POST"],   auth: "admin" },
  { file: "admin/featured/route.ts",                path: "/api/admin/featured",                methods: ["GET", "POST"],   auth: "admin" },
  { file: "admin/featured/rotate/route.ts",         path: "/api/admin/featured/rotate",         methods: ["POST"],          auth: "admin", noBody: true },
  { file: "admin/moderation/route.ts",              path: "/api/admin/moderation",              methods: ["GET", "POST"],   auth: "admin" },

  // ── analytics ────────────────────────────────────────────────────────
  { file: "analytics/hint-usage/route.ts",          path: "/api/analytics/hint-usage",          methods: ["GET", "POST"],   auth: "public" },
  { file: "analytics/[huntId]/route.ts",            path: "/api/analytics/[huntId]",            methods: ["GET"],           auth: "public" },
  { file: "analytics/hunt-view/route.ts",           path: "/api/analytics/hunt-view",           methods: ["GET", "POST"],   auth: "public" },
  { file: "analytics/performance/route.ts",         path: "/api/analytics/performance",         methods: ["GET", "POST"],   auth: "public" },

  // ── csp ──────────────────────────────────────────────────────────────
  { file: "csp-report/route.ts",                    path: "/api/csp-report",                    methods: ["POST"],          auth: "public" },

  // ── embed ────────────────────────────────────────────────────────────
  { file: "embed/[id]/route.ts",                    path: "/api/embed/[id]",                    methods: ["GET"],           auth: "public" },

  // ── health ───────────────────────────────────────────────────────────
  { file: "health/route.ts",                        path: "/api/health",                        methods: ["GET"],           auth: "public" },

  // ── hunts ────────────────────────────────────────────────────────────
  { file: "hunts/schedule/route.ts",                path: "/api/hunts/schedule",                methods: ["POST"],          auth: "public", noBody: true },

  // ── ipfs ─────────────────────────────────────────────────────────────
  { file: "ipfs/route.ts",                          path: "/api/ipfs",                          methods: ["POST"],          auth: "public", noBody: true },

  // ── moderation ───────────────────────────────────────────────────────
  { file: "moderation/submit/route.ts",             path: "/api/moderation/submit",             methods: ["POST"],          auth: "public" },
  { file: "moderation/sync/route.ts",               path: "/api/moderation/sync",               methods: ["GET", "POST"],   auth: "admin" },

  // ── notifications ────────────────────────────────────────────────────
  { file: "notifications/complete/route.tsx",       path: "/api/notifications/complete",        methods: ["POST"],          auth: "public" },

  // ── og ───────────────────────────────────────────────────────────────
  { file: "og/hunt/[id]/route.ts",                  path: "/api/og/hunt/[id]",                  methods: ["GET"],           auth: "public" },
  { file: "og/leaderboard/route.ts",                path: "/api/og/leaderboard",                methods: ["GET"],           auth: "public" },
  { file: "og/result/route.ts",                     path: "/api/og/result",                     methods: ["GET"],           auth: "public" },

  // ── push ─────────────────────────────────────────────────────────────
  // Requires PUSH_API_SECRET or ADMIN_API_SECRET as a bearer token; see
  // app/api/push/send/route.ts and its __tests__ for the credential checks.
  { file: "push/send/route.ts",                     path: "/api/push/send",                     methods: ["POST"],          auth: "admin" },

  // ── push-tokens ──────────────────────────────────────────────────────
  { file: "push-tokens/route.ts",                   path: "/api/push-tokens",                   methods: ["GET", "POST", "DELETE"], auth: "public" },

  // ── v1 / answers ─────────────────────────────────────────────────────
  { file: "v1/answers/route.ts",                    path: "/api/v1/answers",                    methods: ["POST"],          auth: "public" },

  // ── v1 / feature-flags ───────────────────────────────────────────────
  { file: "v1/feature-flags/route.ts",              path: "/api/v1/feature-flags",              methods: ["GET"],           auth: "public" },

  // ── v1 / hunts ───────────────────────────────────────────────────────
  { file: "v1/hunts/route.ts",                      path: "/api/v1/hunts",                      methods: ["GET"],           auth: "public" },
  { file: "v1/hunts/bulk/route.ts",                 path: "/api/v1/hunts/bulk",                 methods: ["POST"],          auth: "public" },
  { file: "v1/hunts/[id]/route.ts",                 path: "/api/v1/hunts/[id]",                 methods: ["GET"],           auth: "public" },
  { file: "v1/hunts/[id]/archive/route.ts",         path: "/api/v1/hunts/[id]/archive",         methods: ["POST"],          auth: "public" },
  { file: "v1/hunts/[id]/collaborators/route.ts",   path: "/api/v1/hunts/[id]/collaborators",   methods: ["GET", "POST"],   auth: "public" },
  { file: "v1/hunts/[id]/collaborators/presence/route.ts", path: "/api/v1/hunts/[id]/collaborators/presence", methods: ["GET", "POST"], auth: "public" },
  { file: "v1/hunts/[id]/collaborators/presence/stream/route.ts", path: "/api/v1/hunts/[id]/collaborators/presence/stream", methods: ["GET"], auth: "public" },
  { file: "v1/hunts/[id]/complete/route.ts",        path: "/api/v1/hunts/[id]/complete",        methods: ["POST"],          auth: "public" },
  { file: "v1/hunts/[id]/delete/route.ts",          path: "/api/v1/hunts/[id]/delete",          methods: ["POST"],          auth: "public" },
  { file: "v1/hunts/[id]/leaderboard/route.ts",     path: "/api/v1/hunts/[id]/leaderboard",     methods: ["GET"],           auth: "public" },
  { file: "v1/hunts/[id]/leaderboard/export/route.ts", path: "/api/v1/hunts/[id]/leaderboard/export", methods: ["GET"],       auth: "public" },
  { file: "v1/hunts/[id]/leaderboard/public/route.ts", path: "/api/v1/hunts/[id]/leaderboard/public", methods: ["GET"],       auth: "public" },
  { file: "v1/hunts/[id]/players/route.ts",         path: "/api/v1/hunts/[id]/players",         methods: ["GET"],           auth: "public" },
  { file: "v1/hunts/[id]/progress/route.ts",        path: "/api/v1/hunts/[id]/progress",        methods: ["GET", "POST"],   auth: "public" },
  { file: "v1/hunts/[id]/ratings/route.ts",         path: "/api/v1/hunts/[id]/ratings",         methods: ["GET"],           auth: "public" },
  { file: "v1/hunts/[id]/reviews/route.ts",         path: "/api/v1/hunts/[id]/reviews",         methods: ["GET", "POST"],   auth: "public" },
  { file: "v1/hunts/[id]/reviews/[reviewId]/moderate/route.ts", path: "/api/v1/hunts/[id]/reviews/[reviewId]/moderate", methods: ["POST"], auth: "public" },

  // ── v1 / seasons ─────────────────────────────────────────────────────
  { file: "v1/seasons/route.ts",                    path: "/api/v1/seasons",                    methods: ["GET", "POST"],   auth: "public" },
  { file: "v1/seasons/[id]/route.ts",               path: "/api/v1/seasons/[id]",               methods: ["GET", "POST", "PATCH"], auth: "public" },
  { file: "v1/seasons/archived/route.ts",           path: "/api/v1/seasons/archived",           methods: ["GET"],           auth: "public" },
  { file: "v1/seasons/badges/route.ts",             path: "/api/v1/seasons/badges",             methods: ["GET", "POST"],   auth: "public" },

  // ── v1 / tags ────────────────────────────────────────────────────────
  { file: "v1/tags/route.ts",                       path: "/api/v1/tags",                       methods: ["GET", "POST"],   auth: "public" },

  // ── v1 / time ────────────────────────────────────────────────────────
  { file: "v1/time/route.ts",                       path: "/api/v1/time",                       methods: ["GET"],           auth: "public" },

  // ── v1 / webhooks ────────────────────────────────────────────────────
  { file: "v1/webhooks/route.ts",                  path: "/api/v1/webhooks",                  methods: ["GET", "POST"],   auth: "public" },
  { file: "v1/webhooks/[id]/route.ts",             path: "/api/v1/webhooks/[id]",             methods: ["PATCH", "DELETE"], auth: "public" },
  { file: "v1/webhooks/events/route.ts",           path: "/api/v1/webhooks/events",           methods: ["POST"],          auth: "public" },
]

// ──────────────────────────────────────────────────────────────────────────
//  Filesystem helpers
// ──────────────────────────────────────────────────────────────────────────

const API_DIR = path.resolve(__dirname, "../app/api")

/** Walk app/api/ and return every route file path relative to app/api/. */
function findRouteFiles(): string[] {
  const results: string[] = []

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (/^route\.(ts|tsx)$/.test(entry.name)) {
        results.push(path.relative(API_DIR, fullPath))
      }
    }
  }

  walk(API_DIR)
  return results.sort()
}

/** Convert a manifest file entry to the normalized key used for comparison. */
function normalizeFile(file: string): string {
  return file.replace(/\.(ts|tsx)$/, "")
}

// ──────────────────────────────────────────────────────────────────────────
//  Tests
// ──────────────────────────────────────────────────────────────────────────

describe("API route manifest", () => {
  const routeFiles = findRouteFiles()
  const manifestKeys = new Map(ROUTE_MANIFEST.map((r) => [normalizeFile(r.file), r]))

  // ── Completeness ──────────────────────────────────────────────────────

  describe("filesystem completeness", () => {
    it("every route file on disk has a manifest entry", () => {
      const missing = routeFiles.filter((f) => !manifestKeys.has(normalizeFile(f)))
      expect(
        missing,
        `Unregistered route files found. Add entries to ROUTE_MANIFEST:\n${missing.map((f) => `  - "${f}"`).join("\n")}`
      ).toEqual([])
    })

    it("no manifest entry points to a missing file", () => {
      const fileSet = new Set(routeFiles)
      const stale = ROUTE_MANIFEST.filter((r) => !fileSet.has(r.file))
      expect(
        stale,
        `Stale manifest entries (file deleted?). Remove from ROUTE_MANIFEST:\n${stale.map((r) => `  - "${r.file}"`).join("\n")}`
      ).toEqual([])
    })
  })

  // ── Auth classification ───────────────────────────────────────────────

  describe("OG hunt route ownership", () => {
    it("keeps exactly one handler for /api/og/hunt/[id]", () => {
      const ogRouteFiles = routeFiles
        .map((file) => file.replace(/\\/g, "/"))
        .filter((file) => file.startsWith("og/hunt/[id]/route."))

      expect(ogRouteFiles).toEqual(["og/hunt/[id]/route.ts"])
      expect(
        ROUTE_MANIFEST.filter((entry) => entry.path === "/api/og/hunt/[id]"),
      ).toEqual([
        expect.objectContaining({
          file: "og/hunt/[id]/route.ts",
          methods: ["GET"],
          auth: "public",
        }),
      ])
    })
  })

  describe("auth classification", () => {
    for (const entry of ROUTE_MANIFEST) {
      it(`${entry.methods.join(",")} ${entry.path} is explicitly classified (auth=${entry.auth})`, () => {
        expect(["admin", "public"]).toContain(entry.auth)
      })
    }
  })

  // ── Body validation ──────────────────────────────────────────────────

  describe("POST body rejection", () => {
    const postRoutes = ROUTE_MANIFEST.filter(
      (r) => r.methods.includes("POST") && !r.noBody
    )

    for (const entry of postRoutes) {
      it(`${entry.path} POST rejects malformed JSON body`, async () => {
        const modPath = `../app/api/${entry.file.replace(/\.tsx$/, "")}`
        const mod = await import(modPath)
        const handler = mod.POST
        expect(handler, `POST handler not exported from ${entry.file}`).toBeDefined()

        const req = new Request(`http://localhost${entry.path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{{{not valid json",
        })

        let res: Response
        try {
          res = await handler(req, {
            params: Promise.resolve({ id: "1", huntId: "1", reviewId: "1" }),
          })
        } catch (err: any) {
          if (err?.statusCode) {
            res = new Response(null, { status: err.statusCode })
          } else {
            throw err
          }
        }

        expect(
          res!.status,
          `POST ${entry.path} should reject malformed body with 4xx, got ${res!.status}`
        ).toBeGreaterThanOrEqual(400)
        expect(res!.status).toBeLessThan(500)
      })
    }
  })
})
