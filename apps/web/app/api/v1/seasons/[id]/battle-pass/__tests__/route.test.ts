import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import * as seasonStore from "@/lib/seasonStore";
import * as battlePassStore from "@/lib/battlePassStore";
import * as walletAuth from "@/lib/walletAuth";

vi.mock("@/lib/rate-limit", () => ({
  getIP: () => "127.0.0.1",
  rateLimit: () => Promise.resolve({ success: true, reset: 0 }),
  rateLimitResponse: () => new Response("Rate limited", { status: 429 }),
}));

vi.mock("@/lib/seasonStore", () => ({
  getSeasonById: vi.fn(),
}));

vi.mock("@/lib/battlePassStore", () => ({
  getBattlePassTiers: vi.fn(),
  getPlayerProgress: vi.fn(),
  claimTierReward: vi.fn(),
}));

vi.mock("@/lib/walletAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/walletAuth")>();
  return { ...actual, verifyCallerAuth: vi.fn(actual.verifyCallerAuth) };
});

const seasonId = "1";
const context = { params: Promise.resolve({ id: seasonId }) };
const validWallet = "GBRPYHIL2CI3FNQ4BXLFMNDLFPPPU2HY52WSGROMKTCVLA5WDWZTVLTC";
const validSignature = "valid_test_signature";
const validChallenge = "hunty_battle_pass_challenge_1";

function authHeaders(wallet = validWallet): Record<string, string> {
  return {
    "x-wallet-address": wallet,
    "x-wallet-signature": validSignature,
    "x-wallet-challenge": validChallenge,
  };
}

describe("Battle Pass API — /api/v1/seasons/[id]/battle-pass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/seasons/[id]/battle-pass", () => {
    it("returns 400 for an invalid season ID", async () => {
      const req = new Request("http://localhost/api/v1/seasons/abc/battle-pass");
      const res = await GET(req, { params: Promise.resolve({ id: "abc" }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Invalid season ID/i);
    });

    it("returns 404 when season does not exist", async () => {
      vi.mocked(seasonStore.getSeasonById).mockReturnValueOnce(null as any);
      const req = new Request("http://localhost/api/v1/seasons/999/battle-pass");
      const res = await GET(req, { params: Promise.resolve({ id: "999" }) });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toMatch(/Season not found/i);
    });

    it("returns season tiers and null progress when address is omitted", async () => {
      const mockSeason = { id: 1, name: "Season 1", rewards: [] } as any;
      const mockTiers = [{ tier: 1, requiredXp: 500, reward: null }];
      vi.mocked(seasonStore.getSeasonById).mockReturnValueOnce(mockSeason);
      vi.mocked(battlePassStore.getBattlePassTiers).mockReturnValueOnce(mockTiers);

      const req = new Request("http://localhost/api/v1/seasons/1/battle-pass");
      const res = await GET(req, context);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        seasonId: 1,
        tiers: mockTiers,
        progress: null,
      });
      expect(battlePassStore.getPlayerProgress).not.toHaveBeenCalled();
    });

    it("returns player progress when address query parameter is provided", async () => {
      const mockSeason = { id: 1, name: "Season 1", rewards: [] } as any;
      const mockTiers = [{ tier: 1, requiredXp: 500, reward: null }];
      const mockProgress = { address: validWallet, seasonId: 1, xp: 600, claimedTiers: [0] };

      vi.mocked(seasonStore.getSeasonById).mockReturnValueOnce(mockSeason);
      vi.mocked(battlePassStore.getBattlePassTiers).mockReturnValueOnce(mockTiers);
      vi.mocked(battlePassStore.getPlayerProgress).mockReturnValueOnce(mockProgress);

      const req = new Request(`http://localhost/api/v1/seasons/1/battle-pass?address=${validWallet}`);
      const res = await GET(req, context);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        seasonId: 1,
        tiers: mockTiers,
        progress: mockProgress,
      });
      expect(battlePassStore.getPlayerProgress).toHaveBeenCalledWith(1, validWallet);
    });
  });

  describe("POST /api/v1/seasons/[id]/battle-pass — Authentication & Authorization", () => {
    it("returns 401 for unauthenticated callers (no credentials)", async () => {
      const req = new NextRequest("http://localhost/api/v1/seasons/1/battle-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierIndex: 0 }),
      });

      const res = await POST(req, context);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/Authentication required/i);
      expect(battlePassStore.claimTierReward).not.toHaveBeenCalled();
    });

    it("returns 401 when wallet credentials are incomplete", async () => {
      const req = new NextRequest("http://localhost/api/v1/seasons/1/battle-pass", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": validWallet,
          // Missing x-wallet-signature and x-wallet-challenge
        },
        body: JSON.stringify({ tierIndex: 0 }),
      });

      const res = await POST(req, context);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/Incomplete wallet authentication payload/i);
      expect(battlePassStore.claimTierReward).not.toHaveBeenCalled();
    });

    it("returns 401 when wallet signature is invalid", async () => {
      const req = new NextRequest("http://localhost/api/v1/seasons/1/battle-pass", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": validWallet,
          "x-wallet-signature": "invalid_sig",
          "x-wallet-challenge": validChallenge,
        },
        body: JSON.stringify({ tierIndex: 0 }),
      });

      const res = await POST(req, context);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/Invalid wallet signature/i);
      expect(battlePassStore.claimTierReward).not.toHaveBeenCalled();
    });

    it("returns 401 when session token is invalid", async () => {
      const req = new NextRequest("http://localhost/api/v1/seasons/1/battle-pass", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer invalid_secret_token",
        },
        body: JSON.stringify({ tierIndex: 0 }),
      });

      const res = await POST(req, context);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/Invalid session token/i);
      expect(battlePassStore.claimTierReward).not.toHaveBeenCalled();
    });

    it("returns 403 for authenticated but unauthorized callers", async () => {
      const req = new NextRequest("http://localhost/api/v1/seasons/1/battle-pass", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          tierIndex: 0,
          unauthorizedActor: true,
        }),
      });

      const res = await POST(req, context);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Forbidden: verified caller is not authorized/i);
      expect(battlePassStore.claimTierReward).not.toHaveBeenCalled();
    });

    it("allows verified wallet caller and derives actor from verified identity, ignoring faked body address", async () => {
      const mockSeason = { id: 1, name: "Season 1", rewards: [] } as any;
      const mockProgress = { address: validWallet, seasonId: 1, xp: 500, claimedTiers: [0] };

      vi.mocked(seasonStore.getSeasonById).mockReturnValueOnce(mockSeason);
      vi.mocked(battlePassStore.claimTierReward).mockReturnValueOnce(mockProgress);

      const fakedAddress = "GFAKED_ADDRESS_NOT_MATCHING_THE_SIGNER_0000000000000000";
      const req = new NextRequest("http://localhost/api/v1/seasons/1/battle-pass", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(validWallet),
        },
        body: JSON.stringify({
          address: fakedAddress,
          tierIndex: 0,
        }),
      });

      const res = await POST(req, context);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ success: true, progress: mockProgress });

      // Actor MUST be derived from verified wallet identity (validWallet), NOT from body (fakedAddress)
      expect(battlePassStore.claimTierReward).toHaveBeenCalledWith(1, validWallet, 0);
    });

    it("allows valid session token caller and derives actor from verified session identity", async () => {
      const mockSeason = { id: 1, name: "Season 1", rewards: [] } as any;
      const sessionUser = "sess_user_alpha";
      const mockProgress = { address: sessionUser, seasonId: 1, xp: 500, claimedTiers: [1] };

      vi.mocked(seasonStore.getSeasonById).mockReturnValueOnce(mockSeason);
      vi.mocked(battlePassStore.claimTierReward).mockReturnValueOnce(mockProgress);

      const req = new NextRequest("http://localhost/api/v1/seasons/1/battle-pass", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionUser}`,
        },
        body: JSON.stringify({ tierIndex: 1 }),
      });

      const res = await POST(req, context);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ success: true, progress: mockProgress });
      expect(battlePassStore.claimTierReward).toHaveBeenCalledWith(1, sessionUser, 1);
    });
  });

  describe("POST /api/v1/seasons/[id]/battle-pass — Route Parameter & Store Validation", () => {
    it("returns 400 for invalid season ID", async () => {
      const req = new NextRequest("http://localhost/api/v1/seasons/xyz/battle-pass", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ tierIndex: 0 }),
      });

      const res = await POST(req, { params: Promise.resolve({ id: "xyz" }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Invalid season ID/i);
      expect(battlePassStore.claimTierReward).not.toHaveBeenCalled();
    });

    it("returns 404 when season does not exist", async () => {
      vi.mocked(seasonStore.getSeasonById).mockReturnValueOnce(null as any);

      const req = new NextRequest("http://localhost/api/v1/seasons/999/battle-pass", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ tierIndex: 0 }),
      });

      const res = await POST(req, { params: Promise.resolve({ id: "999" }) });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toMatch(/Season not found/i);
      expect(battlePassStore.claimTierReward).not.toHaveBeenCalled();
    });

    it("returns 400 when claimTierReward throws an error (e.g. Tier not reached)", async () => {
      const mockSeason = { id: 1, name: "Season 1", rewards: [] } as any;
      vi.mocked(seasonStore.getSeasonById).mockReturnValueOnce(mockSeason);
      vi.mocked(battlePassStore.claimTierReward).mockImplementationOnce(() => {
        throw new Error("Tier not reached");
      });

      const req = new NextRequest("http://localhost/api/v1/seasons/1/battle-pass", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ tierIndex: 2 }),
      });

      const res = await POST(req, context);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Tier not reached/i);
    });
  });
});
