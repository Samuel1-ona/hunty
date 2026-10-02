/**
 * Tests for POST /api/v1/hunts/bulk
 *
 * Acceptance criteria:
 *   - 401 when no authentication credentials are provided
 *   - 403 when the caller is authenticated but does not own one or more hunts
 *   - 200 when the caller is authenticated and owns all hunts in the batch
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredHunt } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────
// Stellar public keys are exactly 56 characters starting with 'G'.
const OWNER = "GOWNER00000000000000000000000000000000000000000000000000";
const OTHER = "GOTHER00000000000000000000000000000000000000000000000000";
const CHALLENGE = "huntly-challenge:generic:test:0:nonce";
const VALID_SIG = "valid_test_signature";

// ─── Module mocks ─────────────────────────────────────────────────────────────
const mockGetHuntById = vi.fn<(id: number) => StoredHunt | undefined>();
const mockHideHuntsFromPublic = vi.fn();
const mockUnhideHuntsFromPublic = vi.fn();
const mockSoftDeleteHunts = vi.fn();
const mockRestoreHunts = vi.fn();
const mockPermanentDeleteHunts = vi.fn();
const mockRecordHuntAudit = vi.fn();

vi.mock("@/lib/huntStoreQueries", () => ({
  getHuntById: (id: number) => mockGetHuntById(id),
}));

vi.mock("@/lib/huntStore", () => ({
  hideHuntsFromPublic: (...args: unknown[]) => mockHideHuntsFromPublic(...args),
  unhideHuntsFromPublic: (...args: unknown[]) => mockUnhideHuntsFromPublic(...args),
  softDeleteHunts: (...args: unknown[]) => mockSoftDeleteHunts(...args),
  restoreHunts: (...args: unknown[]) => mockRestoreHunts(...args),
  permanentDeleteHunts: (...args: unknown[]) => mockPermanentDeleteHunts(...args),
}));

vi.mock("@/lib/db/huntAuditLog", () => ({
  recordHuntAudit: (...args: unknown[]) => mockRecordHuntAudit(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  getIP: vi.fn(() => "127.0.0.1"),
  rateLimit: vi.fn(async () => ({ success: true, reset: undefined })),
  rateLimitResponse: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function loadRoute() {
  vi.resetModules();
  return import("../route");
}

/** Build an authenticated request using wallet challenge headers. */
function authedRequest(
  body: Record<string, unknown>,
  walletAddress = OWNER,
  signature = VALID_SIG
) {
  return new Request("http://localhost/api/v1/hunts/bulk", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-wallet-address": walletAddress,
      "x-wallet-challenge": CHALLENGE,
      "x-wallet-signature": signature,
    },
    body: JSON.stringify(body),
  });
}

/** Build an unauthenticated request (no auth headers). */
function unauthRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/v1/hunts/bulk", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Return a StoredHunt owned by `owner`. */
function makeHunt(id: number, owner: string): StoredHunt {
  return {
    id,
    title: `Hunt ${id}`,
    description: "Test hunt",
    cluesCount: 1,
    status: "Active",
    rewardType: "XLM",
    ownerAddress: owner,
    creator: owner,
  } as StoredHunt;
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("POST /api/v1/hunts/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  // ── 401 — unauthenticated ──────────────────────────────────────────────────
  describe("401 unauthenticated", () => {
    it("returns 401 when no auth headers are provided", async () => {
      const { POST } = await loadRoute();
      const req = unauthRequest({ action: "archive", huntIds: [1] });

      const res = await POST(req as any);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toMatch(/authentication required/i);
    });

    it("returns 401 when wallet signature is invalid", async () => {
      const { POST } = await loadRoute();
      const req = authedRequest(
        { action: "archive", huntIds: [1] },
        OWNER,
        "bad_signature_value"
      );

      const res = await POST(req as any);

      expect(res.status).toBe(401);
    });

    it("returns 401 when wallet auth payload is incomplete (missing signature)", async () => {
      const { POST } = await loadRoute();
      const req = new Request("http://localhost/api/v1/hunts/bulk", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-wallet-address": OWNER,
          // challenge and signature are missing
        },
        body: JSON.stringify({ action: "archive", huntIds: [1] }),
      });

      const res = await POST(req as any);

      expect(res.status).toBe(401);
    });
  });

  // ── 403 — authenticated but not the owner ──────────────────────────────────
  describe("403 wrong owner", () => {
    it("returns 403 when a hunt belongs to a different caller", async () => {
      // Hunt 10 belongs to OTHER, not OWNER
      mockGetHuntById.mockImplementation((id) => {
        if (id === 10) return makeHunt(10, OTHER);
        return undefined;
      });

      const { POST } = await loadRoute();
      const req = authedRequest({ action: "archive", huntIds: [10] });

      const res = await POST(req as any);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toMatch(/forbidden/i);
    });

    it("returns 403 when one hunt in a mixed batch belongs to a different caller", async () => {
      // Hunt 1 is owned by OWNER; hunt 2 is owned by OTHER
      mockGetHuntById.mockImplementation((id) => {
        if (id === 1) return makeHunt(1, OWNER);
        if (id === 2) return makeHunt(2, OTHER);
        return undefined;
      });

      const { POST } = await loadRoute();
      const req = authedRequest({ action: "archive", huntIds: [1, 2] });

      const res = await POST(req as any);

      expect(res.status).toBe(403);
    });

    it("returns 404 when a hunt does not exist", async () => {
      mockGetHuntById.mockReturnValue(undefined);

      const { POST } = await loadRoute();
      const req = authedRequest({ action: "archive", huntIds: [999] });

      const res = await POST(req as any);

      expect(res.status).toBe(404);
    });
  });

  // ── 200 — happy path ───────────────────────────────────────────────────────
  describe("200 success — authenticated owner", () => {
    beforeEach(() => {
      // Both hunts belong to OWNER
      mockGetHuntById.mockImplementation((id) => makeHunt(id, OWNER));
      mockRecordHuntAudit.mockResolvedValue(undefined);
    });

    it("archives hunts owned by the caller and returns success", async () => {
      const { POST } = await loadRoute();
      const req = authedRequest({ action: "archive", huntIds: [1, 2] });

      const res = await POST(req as any);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toMatch(/archived/i);
      expect(mockHideHuntsFromPublic).toHaveBeenCalledWith([1, 2]);
    });

    it("unarchives hunts owned by the caller", async () => {
      const { POST } = await loadRoute();
      const req = authedRequest({ action: "unarchive", huntIds: [3] });

      const res = await POST(req as any);

      expect(res.status).toBe(200);
      expect(mockUnhideHuntsFromPublic).toHaveBeenCalledWith([3]);
    });

    it("soft-deletes hunts owned by the caller", async () => {
      const { POST } = await loadRoute();
      const req = authedRequest({ action: "soft-delete", huntIds: [4] });

      const res = await POST(req as any);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toMatch(/restore them within 30 days/i);
      expect(mockSoftDeleteHunts).toHaveBeenCalledWith([4]);
    });

    it("restores hunts owned by the caller", async () => {
      const { POST } = await loadRoute();
      const req = authedRequest({ action: "restore", huntIds: [5] });

      const res = await POST(req as any);

      expect(res.status).toBe(200);
      expect(mockRestoreHunts).toHaveBeenCalledWith([5]);
    });

    it("permanently deletes hunts when confirmed=true", async () => {
      const { POST } = await loadRoute();
      const req = authedRequest({ action: "permanent-delete", huntIds: [6], confirmed: true });

      const res = await POST(req as any);

      expect(res.status).toBe(200);
      expect(mockPermanentDeleteHunts).toHaveBeenCalledWith([6]);
    });

    it("returns 400 when permanent-delete is requested without confirmed=true", async () => {
      const { POST } = await loadRoute();
      const req = authedRequest({ action: "permanent-delete", huntIds: [6] });

      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it("records an audit entry for each hunt in the batch", async () => {
      const { POST } = await loadRoute();
      const req = authedRequest({ action: "archive", huntIds: [7, 8] });

      await POST(req as any);

      expect(mockRecordHuntAudit).toHaveBeenCalledTimes(2);
      expect(mockRecordHuntAudit).toHaveBeenCalledWith(7, "hunt archived", OWNER, { action: "archive" });
      expect(mockRecordHuntAudit).toHaveBeenCalledWith(8, "hunt archived", OWNER, { action: "archive" });
    });

    it("treats hunts without an ownerAddress as implicitly owned by any caller", async () => {
      // Hunts without an ownerAddress or creator field should pass the ownership check
      mockGetHuntById.mockImplementation((id) => ({
        id,
        title: `Hunt ${id}`,
        description: "No owner",
        cluesCount: 1,
        status: "Draft",
        rewardType: "XLM",
        // ownerAddress and creator deliberately omitted
      } as StoredHunt));

      const { POST } = await loadRoute();
      const req = authedRequest({ action: "archive", huntIds: [100] });

      const res = await POST(req as any);

      expect(res.status).toBe(200);
    });

    it("accepts a session token as alternative auth", async () => {
      // When using a session token, the actor is the session ID (not a wallet address).
      // Use an ownerless hunt so the ownership check passes for any actor.
      mockGetHuntById.mockImplementation((id) => ({
        id,
        title: `Hunt ${id}`,
        description: "Session auth test",
        cluesCount: 1,
        status: "Draft",
        rewardType: "XLM",
        // ownerAddress and creator deliberately omitted — any actor may act on it
      } as StoredHunt));

      const { POST } = await loadRoute();
      const req = new Request("http://localhost/api/v1/hunts/bulk", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Authorization": "Bearer sess_valid-session-token",
        },
        body: JSON.stringify({ action: "archive", huntIds: [9] }),
      });

      const res = await POST(req as any);

      expect(res.status).toBe(200);
    });
  });

  // ── Schema validation ──────────────────────────────────────────────────────
  describe("schema validation", () => {
    it("returns 400 when huntIds is empty", async () => {
      const { POST } = await loadRoute();
      const req = authedRequest({ action: "archive", huntIds: [] });

      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it("returns 400 for an unknown action", async () => {
      const { POST } = await loadRoute();
      const req = authedRequest({ action: "obliterate", huntIds: [1] });

      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });
  });
});
