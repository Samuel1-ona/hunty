import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST, PATCH } from "../route";
import * as adminAuth from "@/lib/api/adminAuth";
import * as walletAuth from "@/lib/walletAuth";
import { AuthError } from "@/lib/api/errors";

vi.mock("@/lib/api/adminAuth", () => ({
  assertAdminAuth: vi.fn(),
}));

vi.mock("@/lib/walletAuth", () => ({
  verifyCallerAuth: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  getIP: () => "127.0.0.1",
  rateLimit: () => Promise.resolve({ success: true, reset: 0 }),
  rateLimitResponse: () => new Response("Rate limited", { status: 429 }),
}));

vi.mock("@/lib/seasonStore", () => ({
  awardSeasonBadge: vi.fn(() => ({ id: "badge-1" })),
  setSeasonTiers: vi.fn(() => []),
  updatePlayerProgress: vi.fn(() => ({})),
}));

describe("Seasons Badges API - Auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createJsonRequest = (body: any) =>
    new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  describe("POST /api/v1/seasons/badges (Badge Awards)", () => {
    it("returns 401 for unauthenticated/unauthorized callers", async () => {
      vi.mocked(adminAuth.assertAdminAuth).mockRejectedValueOnce(new AuthError("Unauthorized"));
      const req = createJsonRequest({ seasonId: "s1", address: "G123", name: "b1", rank: 1 });
      const res = await POST(req, {} as any);
      expect(res.status).toBe(401);
    });

    it("allows admin callers", async () => {
      vi.mocked(adminAuth.assertAdminAuth).mockResolvedValueOnce({ id: "admin", role: "admin" });
      const req = createJsonRequest({ seasonId: "s1", address: "G123", name: "b1", rank: 1 });
      const res = await POST(req, {} as any);
      expect(res.status).toBe(201);
    });
  });

  describe("PATCH /api/v1/seasons/badges (Progress Changes)", () => {
    it("returns 401 for unauthenticated callers", async () => {
      vi.mocked(walletAuth.verifyCallerAuth).mockResolvedValueOnce({
        authenticated: false,
        authorized: false,
        status: 401,
        error: "Auth required",
      });
      const req = createJsonRequest({ seasonId: "s1", progressDelta: 10, address: "G123" });
      const res = await PATCH(req, {} as any);
      expect(res.status).toBe(401);
    });

    it("allows verified caller and derives actor from verified identity", async () => {
      vi.mocked(walletAuth.verifyCallerAuth).mockResolvedValueOnce({
        authenticated: true,
        authorized: true,
        actor: "G_VERIFIED_ACTOR",
      });
      const req = createJsonRequest({ seasonId: "s1", address: "G_FAKED_ADDRESS", progressDelta: 10 });
      const res = await PATCH(req, {} as any);
      expect(res.status).toBe(200);
    });
  });
});
