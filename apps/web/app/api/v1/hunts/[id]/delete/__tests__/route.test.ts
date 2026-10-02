import { describe, it, expect, beforeEach, vi } from "vitest";
import type { StoredHunt } from "@/lib/types";

// Mock dependencies
const mockGetHuntById = vi.fn();
const mockSoftDeleteHunts = vi.fn();
const mockRestoreHunts = vi.fn();
const mockPermanentDeleteHunts = vi.fn();
const mockVerifyCallerAuth = vi.fn();

vi.mock("@/lib/huntStore", () => ({
  getHuntById: (...args: unknown[]) => mockGetHuntById(...args),
  softDeleteHunts: (...args: unknown[]) => mockSoftDeleteHunts(...args),
  restoreHunts: (...args: unknown[]) => mockRestoreHunts(...args),
  permanentDeleteHunts: (...args: unknown[]) => mockPermanentDeleteHunts(...args),
}));

vi.mock("@/lib/walletAuth", () => ({
  verifyCallerAuth: (...args: unknown[]) => mockVerifyCallerAuth(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  getIP: vi.fn(),
  rateLimit: vi.fn(async () => ({ success: true, reset: undefined })),
  rateLimitResponse: vi.fn(),
}));

vi.mock("@/lib/db/huntAuditLog", () => ({
  recordHuntAudit: vi.fn(),
}));

async function loadRoute() {
  vi.resetModules();
  return import("../route");
}

function createRequest(
  huntId: string | number,
  body: Record<string, unknown>,
  method = "POST"
) {
  return new Request(`http://localhost/api/v1/hunts/${huntId}/delete`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/hunts/[id]/delete", () => {
  const validCreatorAddress = "GCREATOR0000000000000000000000000000000000000000000000";
  const validAdminAddress = "session_authenticated_admin";
  const unauthorizedAddress = "GUNAUTHORIZED000000000000000000000000000000000000";
  
  const validBody = {
    action: "soft-delete",
    actorAddress: validCreatorAddress, // The body's actorAddress should now be ignored in favor of auth
  };

  const mockHunt: StoredHunt = {
    id: 1,
    title: "Test Hunt",
    description: "Test hunt for deletion",
    cluesCount: 3,
    status: "Active" as const,
    rewardType: "XLM" as const,
    creator: validCreatorAddress,
    ownerAddress: validCreatorAddress,
  } as StoredHunt;

  beforeEach(() => {
    mockGetHuntById.mockClear();
    mockSoftDeleteHunts.mockClear();
    mockRestoreHunts.mockClear();
    mockPermanentDeleteHunts.mockClear();
    mockVerifyCallerAuth.mockClear();
    
    mockGetHuntById.mockReturnValue(mockHunt);
    mockVerifyCallerAuth.mockResolvedValue({
      authenticated: true,
      authorized: true,
      actor: validCreatorAddress,
    });
  });

  describe("authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mockVerifyCallerAuth.mockResolvedValue({
        authenticated: false,
        authorized: false,
        error: "No session or signature",
      });

      const { POST } = await loadRoute();
      const req = createRequest(1, validBody);

      const res = await POST(req as any, {
        params: Promise.resolve({ id: "1" }),
      } as any);

      expect(res.status).toBe(401);
    });
  });

  describe("authorization", () => {
    it("returns 403 when authenticated but not creator or admin", async () => {
      mockVerifyCallerAuth.mockResolvedValue({
        authenticated: true,
        authorized: true,
        actor: unauthorizedAddress,
      });

      const { POST } = await loadRoute();
      const req = createRequest(1, validBody);

      const res = await POST(req as any, {
        params: Promise.resolve({ id: "1" }),
      } as any);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("only the creator");
    });

    it("allows deletion by admin", async () => {
      mockVerifyCallerAuth.mockResolvedValue({
        authenticated: true,
        authorized: true,
        actor: validAdminAddress,
      });

      const { POST } = await loadRoute();
      const req = createRequest(1, validBody);

      const res = await POST(req as any, {
        params: Promise.resolve({ id: "1" }),
      } as any);

      expect(res.status).toBe(200);
    });
    
    it("allows deletion by creator", async () => {
      const { POST } = await loadRoute();
      const req = createRequest(1, validBody);

      const res = await POST(req as any, {
        params: Promise.resolve({ id: "1" }),
      } as any);

      expect(res.status).toBe(200);
      expect(mockSoftDeleteHunts).toHaveBeenCalledWith([1]);
    });
  });

  describe("actions", () => {
    it("supports restore action", async () => {
      const { POST } = await loadRoute();
      const req = createRequest(1, { action: "restore" });

      const res = await POST(req as any, {
        params: Promise.resolve({ id: "1" }),
      } as any);

      expect(res.status).toBe(200);
      expect(mockRestoreHunts).toHaveBeenCalledWith([1]);
    });

    it("supports permanent-delete action if confirmed", async () => {
      const { POST } = await loadRoute();
      const req = createRequest(1, { action: "permanent-delete", confirmed: true });

      const res = await POST(req as any, {
        params: Promise.resolve({ id: "1" }),
      } as any);

      expect(res.status).toBe(200);
      expect(mockPermanentDeleteHunts).toHaveBeenCalledWith([1]);
    });

    it("rejects permanent-delete action if not confirmed", async () => {
      const { POST } = await loadRoute();
      const req = createRequest(1, { action: "permanent-delete" });

      const res = await POST(req as any, {
        params: Promise.resolve({ id: "1" }),
      } as any);

      expect(res.status).toBe(400);
      expect(mockPermanentDeleteHunts).not.toHaveBeenCalled();
    });
  });
});
