import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCreatorNotifications = vi.fn();
const mockGetModerationStatusForHunts = vi.fn();
const mockMarkNotificationRead = vi.fn();

vi.mock("@/lib/moderation/dbStore", () => ({
  getCreatorNotifications: (...args: unknown[]) => mockGetCreatorNotifications(...args),
  getModerationStatusForHunts: (...args: unknown[]) => mockGetModerationStatusForHunts(...args),
  markNotificationRead: (...args: unknown[]) => mockMarkNotificationRead(...args),
}));

const mockAssertAdminAuth = vi.fn();
vi.mock("@/lib/api/adminAuth", () => ({
  assertAdminAuth: (...args: unknown[]) => mockAssertAdminAuth(...args),
}));

const mockRateLimit = vi.fn();
const mockGetIP = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
  getIP: (...args: unknown[]) => mockGetIP(...args),
}));

async function loadRoute() {
  vi.resetModules();
  return import("../route");
}

describe("/api/moderation/sync route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIP.mockReturnValue("127.0.0.1");
    mockRateLimit.mockResolvedValue({ success: true, remaining: 59, reset: Date.now() + 60000 });
    mockAssertAdminAuth.mockResolvedValue({ id: "admin-1", role: "admin" });
  });

  describe("GET /api/moderation/sync", () => {
    it("calls rateLimit with await and proceeds on success", async () => {
      mockGetCreatorNotifications.mockResolvedValue([{ id: "n1" }]);
      const { GET } = await loadRoute();
      const req = new NextRequest("http://localhost/api/moderation/sync");

      const res = await GET(req);
      expect(res.status).toBe(200);

      expect(mockRateLimit).toHaveBeenCalledWith("sync_ip:127.0.0.1", {
        limit: 60,
        windowMs: 60000,
      });
      const body = await res.json();
      expect(body.notifications).toEqual([{ id: "n1" }]);
    });

    it("returns 429 when rateLimit fails (success: false)", async () => {
      mockRateLimit.mockResolvedValue({ success: false, remaining: 0, reset: 12345 });
      const { GET } = await loadRoute();
      const req = new NextRequest("http://localhost/api/moderation/sync");

      const res = await GET(req);
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.code).toBe("RATE_LIMITED");
    });

    it("returns hunt statuses when huntIds query param is provided", async () => {
      mockGetModerationStatusForHunts.mockResolvedValue({ "1": "approved" });
      const { GET } = await loadRoute();
      const req = new NextRequest("http://localhost/api/moderation/sync?huntIds=1,2");

      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(mockGetModerationStatusForHunts).toHaveBeenCalledWith([1, 2]);
      const body = await res.json();
      expect(body.statuses).toEqual({ "1": "approved" });
    });

    it("requires admin auth", async () => {
      const { AuthError } = await import("@/lib/api/errors");
      mockAssertAdminAuth.mockRejectedValue(new AuthError("Unauthorized"));
      const { GET } = await loadRoute();
      const req = new NextRequest("http://localhost/api/moderation/sync");

      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/moderation/sync", () => {
    it("calls rateLimit with await and marks notification read", async () => {
      mockMarkNotificationRead.mockResolvedValue(true);
      const { POST } = await loadRoute();
      const req = new NextRequest("http://localhost/api/moderation/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notificationId: "n-123" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(mockRateLimit).toHaveBeenCalledWith("sync_ip:127.0.0.1", {
        limit: 60,
        windowMs: 60000,
      });
      expect(mockMarkNotificationRead).toHaveBeenCalledWith("n-123");
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("returns 429 when rateLimit fails (success: false)", async () => {
      mockRateLimit.mockResolvedValue({ success: false, remaining: 0, reset: 12345 });
      const { POST } = await loadRoute();
      const req = new NextRequest("http://localhost/api/moderation/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notificationId: "n-123" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.code).toBe("RATE_LIMITED");
    });

    it("returns 404 if notification is not found", async () => {
      mockMarkNotificationRead.mockResolvedValue(false);
      const { POST } = await loadRoute();
      const req = new NextRequest("http://localhost/api/moderation/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notificationId: "n-999" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(404);
    });
  });
});
