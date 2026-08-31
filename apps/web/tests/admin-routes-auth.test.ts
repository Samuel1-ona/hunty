/**
 * Admin Routes Authentication Tests
 *
 * This test suite ensures every admin API route properly enforces authentication:
 * - Unauthenticated requests return 401
 * - Non-admin authenticated requests return 403
 * - Authenticated admin requests succeed
 *
 * These tests prevent auth guards from being silently removed during refactoring.
 * Issue: #1113
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { getToken } from "next-auth/jwt"

// Import all admin route handlers
import { GET as getAdminFeatured, POST as postAdminFeatured } from "@/app/api/admin/featured/route"
import { POST as postFeaturedRotate } from "@/app/api/admin/featured/rotate/route"
import { GET as getAdminModeration, POST as postAdminModeration } from "@/app/api/admin/moderation/route"
import { GET as getAdminAntiCheat, POST as postAdminAntiCheat } from "@/app/api/admin/anti-cheat/route"
import { GET as getModerationSync, POST as postModerationSync } from "@/app/api/moderation/sync/route"

// Mock next-auth
vi.mock("next-auth/jwt", () => ({ getToken: vi.fn() }))
vi.mock("@/lib/audit", () => ({ auditLog: vi.fn() }))

// Mock database functions to avoid actual DB calls
vi.mock("@/lib/moderation/dbStore", () => ({
  getCreatorNotifications: vi.fn(() => Promise.resolve([])),
  getModerationStatusForHunts: vi.fn(() => Promise.resolve([])),
  getPendingSubmissions: vi.fn(() => Promise.resolve([])),
  getAllSubmissions: vi.fn(() => Promise.resolve([])),
  markNotificationRead: vi.fn(() => Promise.resolve(true)),
  approveSubmission: vi.fn(() =>
    Promise.resolve({ hunt: { title: "Test Hunt" }, creatorEmail: null })
  ),
  rejectSubmission: vi.fn(() =>
    Promise.resolve({ hunt: { title: "Test Hunt" }, creatorEmail: null })
  ),
  flagContentPolicyViolation: vi.fn(() =>
    Promise.resolve({ hunt: { title: "Test Hunt" }, creatorEmail: null })
  ),
}))

vi.mock("@/lib/antiCheatDb", () => ({
  getBannedUsers: vi.fn(() => Promise.resolve([])),
  getFlaggedUsers: vi.fn(() => Promise.resolve([])),
  getAnomalyHistory: vi.fn(() => Promise.resolve([])),
  getSubmissionHistory: vi.fn(() => Promise.resolve([])),
  getConfig: vi.fn(() => Promise.resolve({})),
  setConfig: vi.fn(() => Promise.resolve({})),
  banUser: vi.fn(() => Promise.resolve({})),
  unbanUser: vi.fn(() => Promise.resolve(true)),
}))

vi.mock("@/lib/featuredHuntDb", () => ({
  readFeaturedId: vi.fn(() => Promise.resolve(1)),
  writeFeaturedId: vi.fn(() => Promise.resolve({})),
}))

vi.mock("@/lib/moderation/email", () => ({
  sendModerationActionEmail: vi.fn(() => Promise.resolve({})),
}))

// Helper to create a mock Request
function createRequest(
  url: string,
  options?: {
    method?: string
    body?: string
    headers?: Record<string, string>
  }
): Request {
  const headers = new Headers(options?.headers || {})

  if (options?.body && (options.method === "POST" || options.method === "PUT")) {
    headers.set("content-type", "application/json")
  }

  return new Request(url, {
    method: options?.method || "GET",
    headers,
    body: options?.body,
  })
}

// Helper to create mock route context
const createContext = () => ({
  params: Promise.resolve({ id: "123", huntId: "123" }),
})

describe("Admin Routes Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // GET /api/admin/featured
  // ──────────────────────────────────────────────────────────────────────────

  describe("GET /api/admin/featured", () => {
    it("returns 401 when request has no auth token", async () => {
      ;(getToken as any).mockResolvedValueOnce(null)

      const req = createRequest("http://localhost/api/admin/featured")
      const res = await getAdminFeatured(req, createContext())

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("returns 403 when token role is not admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "user-123",
        role: "user",
        email: "user@example.com",
      })

      const req = createRequest("http://localhost/api/admin/featured")
      const res = await getAdminFeatured(req, createContext())

      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("succeeds when authenticated as admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "admin-456",
        role: "admin",
        email: "admin@example.com",
      })

      const req = createRequest("http://localhost/api/admin/featured")
      const res = await getAdminFeatured(req, createContext())

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveProperty("featuredHuntId")
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // POST /api/admin/featured
  // ──────────────────────────────────────────────────────────────────────────

  describe("POST /api/admin/featured", () => {
    it("returns 401 when request has no auth token", async () => {
      ;(getToken as any).mockResolvedValueOnce(null)

      const req = createRequest("http://localhost/api/admin/featured", {
        method: "POST",
        body: JSON.stringify({ huntId: 1 }),
      })
      const res = await postAdminFeatured(req, createContext())

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("returns 403 when token role is not admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "user-123",
        role: "user",
        email: "user@example.com",
      })

      const req = createRequest("http://localhost/api/admin/featured", {
        method: "POST",
        body: JSON.stringify({ huntId: 1 }),
      })
      const res = await postAdminFeatured(req, createContext())

      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("succeeds when authenticated as admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "admin-456",
        role: "admin",
        email: "admin@example.com",
      })

      const req = createRequest("http://localhost/api/admin/featured", {
        method: "POST",
        body: JSON.stringify({ huntId: 1 }),
      })
      const res = await postAdminFeatured(req, createContext())

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveProperty("success")
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // POST /api/admin/featured/rotate
  // ──────────────────────────────────────────────────────────────────────────

  describe("POST /api/admin/featured/rotate", () => {
    it("returns 401 when request has no auth token", async () => {
      ;(getToken as any).mockResolvedValueOnce(null)

      const req = createRequest("http://localhost/api/admin/featured/rotate", {
        method: "POST",
      })
      const res = await postFeaturedRotate(req, createContext())

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("returns 403 when token role is not admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "user-123",
        role: "user",
        email: "user@example.com",
      })

      const req = createRequest("http://localhost/api/admin/featured/rotate", {
        method: "POST",
      })
      const res = await postFeaturedRotate(req, createContext())

      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("succeeds when authenticated as admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "admin-456",
        role: "admin",
        email: "admin@example.com",
      })

      const req = createRequest("http://localhost/api/admin/featured/rotate", {
        method: "POST",
      })
      const res = await postFeaturedRotate(req, createContext())

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveProperty("success")
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // GET /api/admin/moderation
  // ──────────────────────────────────────────────────────────────────────────

  describe("GET /api/admin/moderation", () => {
    it("returns 401 when request has no auth token", async () => {
      ;(getToken as any).mockResolvedValueOnce(null)

      const req = createRequest("http://localhost/api/admin/moderation")
      const res = await getAdminModeration(req, createContext())

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("returns 403 when token role is not admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "user-123",
        role: "user",
        email: "user@example.com",
      })

      const req = createRequest("http://localhost/api/admin/moderation")
      const res = await getAdminModeration(req, createContext())

      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("succeeds when authenticated as admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "admin-456",
        role: "admin",
        email: "admin@example.com",
      })

      const req = createRequest("http://localhost/api/admin/moderation?view=pending")
      const res = await getAdminModeration(req, createContext())

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveProperty("submissions")
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // POST /api/admin/moderation
  // ──────────────────────────────────────────────────────────────────────────

  describe("POST /api/admin/moderation", () => {
    const validBody = {
      action: "approve",
      submissionId: "sub-123",
      reviewedBy: "admin@example.com",
    }

    it("returns 401 when request has no auth token", async () => {
      ;(getToken as any).mockResolvedValueOnce(null)

      const req = createRequest("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify(validBody),
      })
      const res = await postAdminModeration(req, createContext())

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("returns 403 when token role is not admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "user-123",
        role: "user",
        email: "user@example.com",
      })

      const req = createRequest("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify(validBody),
      })
      const res = await postAdminModeration(req, createContext())

      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("succeeds when authenticated as admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "admin-456",
        role: "admin",
        email: "admin@example.com",
      })

      const req = createRequest("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify(validBody),
      })
      const res = await postAdminModeration(req, createContext())

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveProperty("success")
    })
  })

  describe("GET /api/admin/anti-cheat", () => {
    it("returns 401 when request has no auth token", async () => {
      ;(getToken as any).mockResolvedValueOnce(null)

      const req = createRequest("http://localhost/api/admin/anti-cheat")
      const res = await getAdminAntiCheat(req, createContext())

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("returns 403 when token role is not admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "user-123",
        role: "user",
        email: "user@example.com",
      })

      const req = createRequest("http://localhost/api/admin/anti-cheat")
      const res = await getAdminAntiCheat(req, createContext())

      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("succeeds when authenticated as admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "admin-456",
        role: "admin",
        email: "admin@example.com",
      })

      const req = createRequest("http://localhost/api/admin/anti-cheat?type=config")
      const res = await getAdminAntiCheat(req, createContext())

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toBeDefined()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // POST /api/admin/anti-cheat
  // ──────────────────────────────────────────────────────────────────────────

  describe("POST /api/admin/anti-cheat", () => {
    const validBody = {
      action: "ban",
      wallet: "wallet-123",
      reason: "Suspicious activity",
    }

    it("returns 401 when request has no auth token", async () => {
      ;(getToken as any).mockResolvedValueOnce(null)

      const req = createRequest("http://localhost/api/admin/anti-cheat", {
        method: "POST",
        body: JSON.stringify(validBody),
      })
      const res = await postAdminAntiCheat(req, createContext())

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("returns 403 when token role is not admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "user-123",
        role: "user",
        email: "user@example.com",
      })

      const req = createRequest("http://localhost/api/admin/anti-cheat", {
        method: "POST",
        body: JSON.stringify(validBody),
      })
      const res = await postAdminAntiCheat(req, createContext())

      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("succeeds when authenticated as admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "admin-456",
        role: "admin",
        email: "admin@example.com",
      })

      const req = createRequest("http://localhost/api/admin/anti-cheat", {
        method: "POST",
        body: JSON.stringify(validBody),
      })
      const res = await postAdminAntiCheat(req, createContext())

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveProperty("success")
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // GET /api/moderation/sync
  // ──────────────────────────────────────────────────────────────────────────

  describe("GET /api/moderation/sync", () => {
    it("returns 401 when request has no auth token", async () => {
      ;(getToken as any).mockResolvedValueOnce(null)

      const req = createRequest("http://localhost/api/moderation/sync")
      const res = await getModerationSync(req, createContext())

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("returns 403 when token role is not admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "user-123",
        role: "user",
        email: "user@example.com",
      })

      const req = createRequest("http://localhost/api/moderation/sync")
      const res = await getModerationSync(req, createContext())

      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("succeeds when authenticated as admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "admin-456",
        role: "admin",
        email: "admin@example.com",
      })

      const req = createRequest("http://localhost/api/moderation/sync")
      const res = await getModerationSync(req, createContext())

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveProperty("notifications")
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // POST /api/moderation/sync
  // ──────────────────────────────────────────────────────────────────────────

  describe("POST /api/moderation/sync", () => {
    const validBody = {
      notificationId: "notif-123",
    }

    it("returns 401 when request has no auth token", async () => {
      ;(getToken as any).mockResolvedValueOnce(null)

      const req = createRequest("http://localhost/api/moderation/sync", {
        method: "POST",
        body: JSON.stringify(validBody),
      })
      const res = await postModerationSync(req, createContext())

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("returns 403 when token role is not admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "user-123",
        role: "user",
        email: "user@example.com",
      })

      const req = createRequest("http://localhost/api/moderation/sync", {
        method: "POST",
        body: JSON.stringify(validBody),
      })
      const res = await postModerationSync(req, createContext())

      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("succeeds when authenticated as admin", async () => {
      ;(getToken as any).mockResolvedValueOnce({
        sub: "admin-456",
        role: "admin",
        email: "admin@example.com",
      })

      const req = createRequest("http://localhost/api/moderation/sync", {
        method: "POST",
        body: JSON.stringify(validBody),
      })
      const res = await postModerationSync(req, createContext())

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveProperty("success")
    })
  })
})
