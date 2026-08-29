import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

import { PUBLIC_API_ROUTES } from "../lib/api/publicRoutes"

/**
 * Route-tree authorization enumeration test (issue #865).
 *
 * Walks every `route.ts`/`route.tsx` file under `app/api/` on disk and
 * asserts each one is EITHER:
 *   (a) listed in `lib/api/publicRoutes.ts` (explicitly, reviewed public), OR
 *   (b) references `withAuth(` or `withAdminAuth(` somewhere in its source
 *       (i.e. at least one exported handler is centrally authorized).
 *
 * A route file satisfying neither fails this test. That is the enforcement
 * mechanism for "the default for a new route is closed, not open": add a
 * new `app/api/**\/route.ts` and forget to wrap it (or register it as
 * public), and CI breaks — it cannot silently ship open.
 *
 * This is a source-level check (string search), not a runtime check. It
 * verifies the route *references* the wrapper, not that every exported
 * method uses it — a file can mix a public GET with an auth-gated POST,
 * which is why mixed files don't need a `publicRoutes.ts` entry (see that
 * file's docstring). This mirrors the existing manifest-style test in
 * `api_route_contract.test.ts`, which enumerates the same tree for a
 * different purpose (completeness + POST body validation); this test is
 * specifically the "is authorization wired up" check called for by issue
 * #865's acceptance criteria.
 */

const API_DIR = path.resolve(__dirname, "../app/api")

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

/** Normalize a path to forward slashes so Windows/POSIX agree. */
function toPosix(p: string): string {
  return p.split(path.sep).join("/")
}

const AUTH_WRAPPER_PATTERN = /\bwithAuth\(|\bwithAdminAuth\(/

describe("API route authorization coverage", () => {
  const routeFiles = findRouteFiles().map(toPosix)
  const publicSet = new Set(PUBLIC_API_ROUTES)

  it("every route file on disk is either explicitly public or references withAuth/withAdminAuth", () => {
    const uncovered: string[] = []

    for (const file of routeFiles) {
      if (publicSet.has(file)) continue

      const source = fs.readFileSync(path.join(API_DIR, file), "utf8")
      if (AUTH_WRAPPER_PATTERN.test(source)) continue

      uncovered.push(file)
    }

    expect(
      uncovered,
      `The following route file(s) are neither registered in lib/api/publicRoutes.ts ` +
        `nor reference withAuth(/withAdminAuth( — every new route defaults to CLOSED, ` +
        `so this must be fixed (wrap the handler(s), or explicitly register the file as ` +
        `public with a reason):\n${uncovered.map((f) => `  - ${f}`).join("\n")}`
    ).toEqual([])
  })

  it("every entry in PUBLIC_API_ROUTES points to a real, existing route file", () => {
    const fileSet = new Set(routeFiles)
    const stale = PUBLIC_API_ROUTES.filter((p) => !fileSet.has(p))

    expect(
      stale,
      `Stale PUBLIC_API_ROUTES entries (file deleted/renamed?). Remove from ` +
        `lib/api/publicRoutes.ts:\n${stale.map((f) => `  - ${f}`).join("\n")}`
    ).toEqual([])
  })

  it("PUBLIC_API_ROUTES has no duplicate entries", () => {
    const seen = new Set<string>()
    const duplicates: string[] = []
    for (const entry of PUBLIC_API_ROUTES) {
      if (seen.has(entry)) duplicates.push(entry)
      seen.add(entry)
    }
    expect(duplicates).toEqual([])
  })

  it("sanity: at least one protected and one public route were found (test isn't vacuous)", () => {
    expect(routeFiles.length).toBeGreaterThan(0)
    expect(PUBLIC_API_ROUTES.length).toBeGreaterThan(0)

    const protectedCount = routeFiles.filter((file) => {
      if (publicSet.has(file)) return false
      const source = fs.readFileSync(path.join(API_DIR, file), "utf8")
      return AUTH_WRAPPER_PATTERN.test(source)
    }).length

    expect(protectedCount).toBeGreaterThan(0)
  })
})
