/**
 * Tests for the hunt notify-followers API endpoint
 *
 * POST /api/v1/hunts/[id]/notify-followers
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockGetPublicHuntByIdOptimized = vi.fn();
const mockNotifyFollowersOfNewHunt = vi.fn();
const mockVerifyCallerAuth = vi.fn();

vi.mock("@/lib/db/queryOptimizer", () => ({
  getPublicHuntByIdOptimized: (...args: unknown[]) => mockGetPublicHuntByIdOptimized(...args),
}));

vi.mock("@/lib/follows", () => ({
  notifyFollowersOfNewHunt: (...args: unknown[]) => mockNotifyFollowersOfNewHunt(...args),
}));

vi.mock("@/lib/walletAuth", () => ({
  verifyCallerAuth: (...args: unknown[]) => mockVerifyCallerAuth(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  getIP: vi.fn(),
  rateLimit: vi.fn(async () => ({ success: true, reset: undefined })),
  rateLimitResponse: vi.fn(),
}));

async function loadRoute() {
  vi.resetModules();
  mockGetPublicHuntByIdOptimized.mockClear();
  mockNotifyFollowersOfNewHunt.mockClear();
  mockVerifyCallerAuth.mockClear();
  return import("../route");
}

function createRequest(
  huntId: string | number,
  method = "POST"
) {
  return new Request(`http://localhost/api/v1/hunts/${huntId}/notify-followers`, {
    method,
  });
}

describe("POST /api/v1/hunts/[id]/notify-followers", () => {
  const validCreatorAddress = "GCREATOR0000000000000000000000000000000000000000000000";

  beforeEach(() => {
    mockGetPublicHuntByIdOptimized.mockClear();
    mockNotifyFollowersOfNewHunt.mockClear();
    mockVerifyCallerAuth.mockClear();

    mockGetPublicHuntByIdOptimized.mockReturnValue({
      id: 1,
      title: "Test Hunt",
      creator: validCreatorAddress,
    });
    
    mockNotifyFollowersOfNewHunt.mockReturnValue([{ id: 1 }, { id: 2 }]);
  });

  describe("authentication and authorization", () => {
    it("returns 401 for unauthenticated callers", async () => {
      mockVerifyCallerAuth.mockResolvedValueOnce({
        authenticated: false,
        authorized: false,
        error: "Authentication required",
      });

      const { POST } = await loadRoute();
      const req = createRequest(1);

      const res = await POST(req as any, {
        params: Promise.resolve({ id: "1" }),
      } as any);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 for authenticated but unauthorized callers", async () => {
      mockVerifyCallerAuth.mockResolvedValueOnce({
        authenticated: true,
        authorized: false,
        error: "Access denied",
      });

      const { POST } = await loadRoute();
      const req = createRequest(1);

      const res = await POST(req as any, {
        params: Promise.resolve({ id: "1" }),
      } as any);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe("FORBIDDEN");
    });

    it("returns 403 if the verified actor is not the hunt creator", async () => {
      mockVerifyCallerAuth.mockResolvedValueOnce({
        authenticated: true,
        authorized: true,
        actor: "GOTHER0000000000000000000000000000000000000000000000000",
      });

      const { POST } = await loadRoute();
      const req = createRequest(1);

      const res = await POST(req as any, {
        params: Promise.resolve({ id: "1" }),
      } as any);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe("FORBIDDEN");
    });

    it("returns 200 for the actual creator", async () => {
      mockVerifyCallerAuth.mockResolvedValueOnce({
        authenticated: true,
        authorized: true,
        actor: validCreatorAddress,
      });

      const { POST } = await loadRoute();
      const req = createRequest(1);

      const res = await POST(req as any, {
        params: Promise.resolve({ id: "1" }),
      } as any);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.notified).toBe(2);
      expect(mockNotifyFollowersOfNewHunt).toHaveBeenCalledWith(validCreatorAddress, { id: 1, title: "Test Hunt" });
    });
    
    it("returns 200 for authenticated admin session", async () => {
      mockVerifyCallerAuth.mockResolvedValueOnce({
        authenticated: true,
        authorized: true,
        actor: "session_authenticated_admin",
      });

      const { POST } = await loadRoute();
      const req = createRequest(1);

      const res = await POST(req as any, {
        params: Promise.resolve({ id: "1" }),
      } as any);

describe("hunts/:id/notify-followers API", () => {
  beforeEach(() => resetFollowsStore())
  afterEach(() => resetFollowsStore())

  it("notifies followers when a hunt is published", async () => {
    vi.mocked(getPublicHuntByIdOptimized).mockReturnValue({
      id: HUNT_ID,
      title: "New Hunt",
      creator: CREATOR,
    } as any)

    const { POST } = await loadRoute()
    const follows = await import("@/lib/follows")
    follows.resetFollowsStore()
    await follows.followCreator(FOLLOWER, CREATOR)

    const res = await POST(post(HUNT_ID) as any, ctx(HUNT_ID) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.notified).toBe(1)
  })

  it("returns 400 for a non-numeric id", async () => {
    const { POST } = await loadRoute()
    const res = await POST(
      new Request("http://localhost/api/v1/hunts/abc/notify-followers", { method: "POST" }) as any, ctx(NaN) as any
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 when the hunt is missing", async () => {
    vi.mocked(getPublicHuntByIdOptimized).mockReturnValue(undefined)
    const { POST } = await loadRoute()
    const res = await POST(post(HUNT_ID) as any, ctx(HUNT_ID) as any)
    expect(res.status).toBe(400)
  })

  it("does nothing when the hunt has no creator", async () => {
    vi.mocked(getPublicHuntByIdOptimized).mockReturnValue({ id: HUNT_ID, title: "X" } as any)
    const { POST } = await loadRoute()
    const res = await POST(post(HUNT_ID) as any, ctx(HUNT_ID) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.notified).toBe(0)
  })
})
