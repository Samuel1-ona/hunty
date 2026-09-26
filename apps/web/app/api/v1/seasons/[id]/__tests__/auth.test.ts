/**
 * Auth guards for the mutating season routes.
 *
 * Seasons are admin-only: unauthenticated callers must receive 401, while a
 * caller presenting a valid admin session or signed wallet challenge must be
 * allowed through. The route is exercised against the real `verifyCallerAuth`
 * helper so a regression in either layer fails this test.
 *
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  getIP: () => "127.0.0.1",
  rateLimit: async () => ({ success: true, reset: 0 }),
  rateLimitResponse: () => new Response("Rate limited", { status: 429 }),
}));

const SEASON_ID = "2";
const ADMIN_SECRET = "test-season-admin-secret";

function ctx() {
  return { params: Promise.resolve({ id: SEASON_ID }) };
}

function patchReq(headers: Record<string, string> = {}) {
  return new Request(`http://localhost/api/v1/seasons/${SEASON_ID}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ status: "Ended" }),
  });
}

function postReq(headers: Record<string, string> = {}) {
  return new Request(`http://localhost/api/v1/seasons/${SEASON_ID}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ finalLeaderboard: [] }),
  });
}

async function loadRoute() {
  vi.resetModules();
  return import("../route");
}

describe("seasons/:id mutating route auth", () => {
  beforeEach(() => {
    process.env.SCHEDULE_API_SECRET = ADMIN_SECRET;
  });

  afterEach(() => {
    delete process.env.SCHEDULE_API_SECRET;
    vi.resetModules();
  });

  it("rejects an unauthenticated PATCH with 401", async () => {
    const { PATCH } = await loadRoute();
    const res = await PATCH(patchReq() as never, ctx() as never);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("UNAUTHORIZED");
  });

  it("allows an authenticated admin session to PATCH", async () => {
    const { PATCH } = await loadRoute();
    const res = await PATCH(
      patchReq({ "x-session-token": ADMIN_SECRET }) as never,
      ctx() as never,
    );
    expect(res.status).toBe(200);
  });

  it("rejects an unauthenticated POST with 401", async () => {
    const { POST } = await loadRoute();
    const res = await POST(postReq() as never, ctx() as never);
    expect(res.status).toBe(401);
  });

  it("allows an authenticated admin session to POST", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      postReq({ "x-session-token": ADMIN_SECRET }) as never,
      ctx() as never,
    );
    expect(res.status).toBe(200);
  });
});
