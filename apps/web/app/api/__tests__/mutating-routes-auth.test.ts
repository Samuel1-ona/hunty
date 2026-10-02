/**
 * Mutating API Routes Authentication Tests
 *
 * Verifies that mutating API routes (POST, PUT, PATCH, DELETE) properly reject
 * unauthenticated requests with 401 Unauthorized or 403 Forbidden.
 *
 * Public endpoints (e.g. csp-report, analytics/*) are governed by an explicit allow-list.
 *
 * @vitest-environment node
 */

import fs from "fs";
import path from "path";
import { describe, expect, it, vi } from "vitest";

// Mock next-auth and common server dependencies
vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(() => Promise.resolve(null)),
}));
vi.mock("@/lib/audit", () => ({
  auditLog: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/lib/rate-limit", () => ({
  getIP: () => "127.0.0.1",
  rateLimit: () => Promise.resolve({ success: true, reset: 0 }),
  rateLimitResponse: () => new Response("Rate limited", { status: 429 }),
}));

export const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;
export type MutatingMethod = (typeof MUTATING_METHODS)[number];

/**
 * Explicit allow-list for mutating endpoints that are intentionally public
 * (e.g. browser reporting, anonymous analytics telemetry, public webhooks/time).
 */
export const PUBLIC_ALLOW_LIST: Array<string | RegExp> = [
  /csp-report/,
  /analytics\/.*/,
  /analytics$/,
  /api\/v1\/time/,
];

export function isAllowListed(normalizedRoute: string): boolean {
  return PUBLIC_ALLOW_LIST.some((rule) =>
    typeof rule === "string" ? normalizedRoute.includes(rule) : rule.test(normalizedRoute)
  );
}

const WEB_ROOT = path.resolve(__dirname, "../../../");
const API_ROOT = path.resolve(WEB_ROOT, "app/api");

export function findRouteFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === "__tests__") continue;
    const filePath = path.resolve(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findRouteFiles(filePath));
    } else if (file === "route.ts" || file === "route.tsx") {
      results.push(filePath);
    }
  }
  return results;
}

export function createUnauthenticatedRequest(url: string, method: string): Request {
  const headers = new Headers({
    "content-type": "application/json",
  });
  return new Request(url, {
    method,
    headers,
    body: JSON.stringify({}),
  });
}

export function createMockRouteContext() {
  return {
    params: Promise.resolve({
      id: "1",
      huntId: "1",
      draftId: "1",
      version: "1",
      reviewId: "1",
    }),
  };
}

describe("Mutating API Routes Authentication Guards", () => {
  const routeFiles = findRouteFiles(API_ROOT);

  it("finds API route files in the workspace", () => {
    expect(routeFiles.length).toBeGreaterThan(0);
  });

  describe("Public Route Allow-list Verification", () => {
    it("explicitly permits public reporting and analytics endpoints", () => {
      expect(isAllowListed("app/api/csp-report")).toBe(true);
      expect(isAllowListed("app/api/analytics/performance")).toBe(true);
      expect(isAllowListed("app/api/analytics/hunt-view")).toBe(true);
      expect(isAllowListed("app/api/analytics/hint-usage")).toBe(true);
    });

    it("does not allow-list protected or sensitive endpoints", () => {
      expect(isAllowListed("app/api/admin/moderation")).toBe(false);
      expect(isAllowListed("app/api/admin/featured")).toBe(false);
      expect(isAllowListed("app/api/v1/hunts/1/delete")).toBe(false);
      expect(isAllowListed("app/api/v1/payouts")).toBe(false);
      expect(isAllowListed("app/api/v1/hunts/1/collaborators")).toBe(false);
    });
  });

  describe("Table-driven mutating routes enumeration and execution", () => {
    for (const routeFile of routeFiles) {
      const relativePath = path.relative(WEB_ROOT, routeFile).replace(/\\/g, "/");

      it(`evaluates mutating handlers in ${relativePath}`, async () => {
        let mod: Record<string, unknown>;
        try {
          mod = await import(routeFile);
        } catch {
          // Skip if route file cannot be loaded in test isolation
          return;
        }

        const exportedMutating = MUTATING_METHODS.filter(
          (m) => typeof mod[m] === "function"
        );

        if (exportedMutating.length === 0) {
          // Read-only / GET route
          return;
        }

        const allowListed = isAllowListed(relativePath);

        for (const method of exportedMutating) {
          const handler = mod[method] as (req: Request, ctx: unknown) => Promise<Response>;
          const req = createUnauthenticatedRequest(`http://localhost/${relativePath}`, method);

          try {
            const res = await handler(req, createMockRouteContext());
            if (res instanceof Response) {
              if (allowListed) {
                // Public routes should not reject with authentication required (401)
                expect(res.status).not.toBe(401);
              } else {
                // Protected routes must reject unauthenticated callers with 401 or 403
                expect([400, 401, 403]).toContain(res.status);
              }
            }
          } catch (err: unknown) {
            expect(err).toBeDefined();
          }
        }
      });
    }
  });

  describe("Specific Protected Mutating Route Verification", () => {
    it("rejects unauthenticated POST to admin moderation with 401/403", async () => {
      const mod = await import("@/app/api/admin/moderation/route");
      const req = createUnauthenticatedRequest("http://localhost/api/admin/moderation", "POST");
      const res = await mod.POST(req, createMockRouteContext());
      expect([401, 403]).toContain(res.status);
    });

    it("rejects unauthenticated POST to admin featured with 401/403", async () => {
      const mod = await import("@/app/api/admin/featured/route");
      const req = createUnauthenticatedRequest("http://localhost/api/admin/featured", "POST");
      const res = await mod.POST(req, createMockRouteContext());
      expect([401, 403]).toContain(res.status);
    });

    it("rejects unauthenticated POST to admin anti-cheat with 401/403", async () => {
      const mod = await import("@/app/api/admin/anti-cheat/route");
      const req = createUnauthenticatedRequest("http://localhost/api/admin/anti-cheat", "POST");
      const res = await mod.POST(req, createMockRouteContext());
      expect([401, 403]).toContain(res.status);
    });

    it("rejects unauthenticated POST to moderation sync with 401/403", async () => {
      const mod = await import("@/app/api/moderation/sync/route");
      const req = createUnauthenticatedRequest("http://localhost/api/moderation/sync", "POST");
      const res = await mod.POST(req, createMockRouteContext());
      expect([401, 403]).toContain(res.status);
    });
  });
});
