/**
 * Tests for POST /api/v1/referrals/payouts
 *
 * Verifies that:
 *   - Unauthenticated requests are rejected with 401
 *   - Requests authenticated with a non-admin role are rejected with 403
 *   - Admin session requests are accepted and execute correctly
 *   - Background-job requests with a valid X-Admin-Token are accepted
 *   - Background-job requests with an invalid X-Admin-Token are rejected with 401
 *   - Missing X-Admin-Token with no session falls through to 401
 *   - The actor identity is derived from the credential, never from the body
 *   - GET remains publicly accessible without auth
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAssertAdminAuth = vi.fn()
const mockAuditLog = vi.fn()
const mockGetAllPayouts = vi.fn()
const mockProcessReferralPayouts = vi.fn()

vi.mock("@/lib/api/adminAuth", () => ({
  assertAdminAuth: (...args: unknown[]) => mockAssertAdminAuth(...args),
}))

vi.mock("@/lib/audit", () => ({
  auditLog: (...args: unknown[]) => mockAuditLog(...args),
}))

vi.mock("@/lib/referralStore", () => ({
  getAllPayouts: (...args: unknown[]) => mockGetAllPayouts(...args),
  processReferralPayouts: (...args: unknown[]) => mockProcessReferralPayouts(...args),
}))

vi.mock("@/lib/rate-limit", () => ({
  getIP: vi.fn(() => "127.0.0.1"),
  rateLimit: vi.fn(async () => ({ success: true, reset: undefined })),
  rateLimitResponse: vi.fn(),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_BODY = {
  period: "weekly",
  allocations: [
    { rank: 1, referrerAddress: "GREFERRER10000000000000000000000000000000000000000000", amount: 750, rewardType: "points" },
    { rank: 2, referrerAddress: "GREFERRER20000000000000000000000000000000000000000000", amount: 450, rewardType: "points" },
  ],
  execute: false,
}

const VALID_EXECUTE_BODY = { ...VALID_BODY, execute: true }

const MOCK_DRY_RUN_RESULT = {
  preview: true,
  allocations: VALID_BODY.allocations,
  period: "weekly",
  payouts: [],
}

const MOCK_EXECUTE_RESULT = {
  preview: false,
  allocations: VALID_BODY.allocations,
  period: "weekly",
  payouts: [{ id: "payout-1", status: "pending" }],
}

function postRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/v1/referrals/payouts", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
}

function getRequest(): Request {
  return new Request("http://localhost/api/v1/referrals/payouts")
}

// Load the route once after all mocks are established so that the module graph
// uses the same AppError class instance as the error-handling utilities.
// vi.resetModules() before every import would produce a fresh AppError class
// that breaks instanceof checks inside withErrorHandling/errorResponse.
async function loadRoute() {
  return import("../route")
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockAssertAdminAuth.mockReset()
  mockAuditLog.mockReset()
  mockGetAllPayouts.mockReset()
  mockProcessReferralPayouts.mockReset()

  // Default store behaviour
  mockGetAllPayouts.mockReturnValue([])
  mockProcessReferralPayouts.mockReturnValue(MOCK_DRY_RUN_RESULT)

  // Default: no ADMIN_API_TOKEN configured
  delete process.env.ADMIN_API_TOKEN
})

afterEach(() => {
  delete process.env.ADMIN_API_TOKEN
})

// ── GET (public) ───────────────────────────────────────────────────────────────

describe("GET /api/v1/referrals/payouts", () => {
  it("returns 200 and payout list without any authentication", async () => {
    const payouts = [{ id: "p1", status: "paid" }, { id: "p2", status: "pending" }]
    mockGetAllPayouts.mockReturnValue(payouts)

    const { GET } = await loadRoute()
    const res = await GET(getRequest() as any)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.payouts).toEqual(payouts)
    expect(body.total).toBe(2)
  })

  it("returns empty array when there are no payouts", async () => {
    mockGetAllPayouts.mockReturnValue([])

    const { GET } = await loadRoute()
    const res = await GET(getRequest() as any)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.payouts).toEqual([])
    expect(body.total).toBe(0)
  })
})

// ── POST — unauthenticated ────────────────────────────────────────────────────

describe("POST /api/v1/referrals/payouts — unauthenticated", () => {
  it("returns 401 when there is no session and no X-Admin-Token header", async () => {
    // Import AuthError from the same module graph so instanceof checks pass
    const { AuthError } = await import("@/lib/api/errors")
    mockAssertAdminAuth.mockRejectedValue(new AuthError("Unauthorized"))

    const { POST } = await loadRoute()
    const res = await POST(postRequest(VALID_BODY) as any)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe("UNAUTHORIZED")
  })

  it("does not invoke processReferralPayouts when unauthenticated", async () => {
    const { AuthError } = await import("@/lib/api/errors")
    mockAssertAdminAuth.mockRejectedValue(new AuthError("Unauthorized"))

    const { POST } = await loadRoute()
    await POST(postRequest(VALID_BODY) as any)

    expect(mockProcessReferralPayouts).not.toHaveBeenCalled()
  })
})

// ── POST — wrong role (authenticated but not admin) ───────────────────────────

describe("POST /api/v1/referrals/payouts — authenticated non-admin", () => {
  it("returns 403 when the session role is not admin", async () => {
    const { ForbiddenError } = await import("@/lib/api/errors")
    mockAssertAdminAuth.mockRejectedValue(new ForbiddenError("Forbidden"))

    const { POST } = await loadRoute()
    const res = await POST(postRequest(VALID_BODY) as any)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe("FORBIDDEN")
  })

  it("does not invoke processReferralPayouts for a non-admin session", async () => {
    const { ForbiddenError } = await import("@/lib/api/errors")
    mockAssertAdminAuth.mockRejectedValue(new ForbiddenError("Forbidden"))

    const { POST } = await loadRoute()
    await POST(postRequest(VALID_BODY) as any)

    expect(mockProcessReferralPayouts).not.toHaveBeenCalled()
  })
})

// ── POST — admin session ───────────────────────────────────────────────────────

describe("POST /api/v1/referrals/payouts — admin session", () => {
  beforeEach(() => {
    mockAssertAdminAuth.mockResolvedValue({
      id: "admin-user-id",
      email: "admin@example.com",
      role: "admin",
    })
  })

  it("returns 200 for a dry-run (execute=false) by an admin", async () => {
    mockProcessReferralPayouts.mockReturnValue(MOCK_DRY_RUN_RESULT)

    const { POST } = await loadRoute()
    const res = await POST(postRequest(VALID_BODY) as any)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(MOCK_DRY_RUN_RESULT)
  })

  it("returns 201 when execute=true and admin session is present", async () => {
    mockProcessReferralPayouts.mockReturnValue(MOCK_EXECUTE_RESULT)

    const { POST } = await loadRoute()
    const res = await POST(postRequest(VALID_EXECUTE_BODY) as any)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toEqual(MOCK_EXECUTE_RESULT)
  })

  it("passes allocations to processReferralPayouts derived from the body", async () => {
    const { POST } = await loadRoute()
    await POST(postRequest(VALID_BODY) as any)

    expect(mockProcessReferralPayouts).toHaveBeenCalledWith(
      "weekly",
      expect.arrayContaining([
        expect.objectContaining({ rank: 1, amount: 750 }),
        expect.objectContaining({ rank: 2, amount: 450 }),
      ]),
      false
    )
  })

  it("emits an audit log when execute=true", async () => {
    mockProcessReferralPayouts.mockReturnValue(MOCK_EXECUTE_RESULT)

    const { POST } = await loadRoute()
    await POST(postRequest(VALID_EXECUTE_BODY) as any)

    expect(mockAuditLog).toHaveBeenCalledWith(
      "referral_payouts_executed",
      expect.objectContaining({ period: "weekly", allocationCount: 2 }),
      "admin-user-id"   // actor must come from verified session, not body
    )
  })

  it("does NOT emit an execution audit log for dry-run (execute=false)", async () => {
    const { POST } = await loadRoute()
    await POST(postRequest(VALID_BODY) as any)

    const executionLog = mockAuditLog.mock.calls.find(
      ([action]: [string]) => action === "referral_payouts_executed"
    )
    expect(executionLog).toBeUndefined()
  })

  it("returns 400 for an invalid body (missing allocations)", async () => {
    const { POST } = await loadRoute()
    const res = await POST(postRequest({ period: "weekly" }) as any)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 for an empty allocations array", async () => {
    const { POST } = await loadRoute()
    const res = await POST(postRequest({ period: "weekly", allocations: [] }) as any)

    expect(res.status).toBe(400)
  })
})

// ── POST — background-job token (X-Admin-Token) ───────────────────────────────

describe("POST /api/v1/referrals/payouts — background-job API key", () => {
  const VALID_JOB_TOKEN = "super-secret-job-token-abc123"

  beforeEach(() => {
    process.env.ADMIN_API_TOKEN = VALID_JOB_TOKEN
    // No active session — background jobs rely on the header alone.
    // assertAdminAuth should not be called when X-Admin-Token path is taken.
    mockAssertAdminAuth.mockReset()
  })

  it("returns 200 for a dry-run with a valid X-Admin-Token", async () => {
    mockProcessReferralPayouts.mockReturnValue(MOCK_DRY_RUN_RESULT)

    const { POST } = await loadRoute()
    const res = await POST(postRequest(VALID_BODY, { "x-admin-token": VALID_JOB_TOKEN }) as any)

    expect(res.status).toBe(200)
  })

  it("returns 201 when execute=true with a valid X-Admin-Token", async () => {
    mockProcessReferralPayouts.mockReturnValue(MOCK_EXECUTE_RESULT)

    const { POST } = await loadRoute()
    const res = await POST(postRequest(VALID_EXECUTE_BODY, { "x-admin-token": VALID_JOB_TOKEN }) as any)

    expect(res.status).toBe(201)
  })

  it("returns 401 when X-Admin-Token does not match ADMIN_API_TOKEN", async () => {
    const { POST } = await loadRoute()
    const res = await POST(postRequest(VALID_BODY, { "x-admin-token": "wrong-token" }) as any)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe("UNAUTHORIZED")
  })

  it("returns 401 when X-Admin-Token is provided but ADMIN_API_TOKEN is not configured", async () => {
    delete process.env.ADMIN_API_TOKEN

    const { POST } = await loadRoute()
    const res = await POST(postRequest(VALID_BODY, { "x-admin-token": "any-token" }) as any)

    expect(res.status).toBe(401)
  })

  it("does not call processReferralPayouts on an invalid job token", async () => {
    const { POST } = await loadRoute()
    await POST(postRequest(VALID_BODY, { "x-admin-token": "wrong-token" }) as any)

    expect(mockProcessReferralPayouts).not.toHaveBeenCalled()
  })

  it("records the actor as background-job in the audit log when executing", async () => {
    mockProcessReferralPayouts.mockReturnValue(MOCK_EXECUTE_RESULT)

    const { POST } = await loadRoute()
    await POST(postRequest(VALID_EXECUTE_BODY, { "x-admin-token": VALID_JOB_TOKEN }) as any)

    expect(mockAuditLog).toHaveBeenCalledWith(
      "referral_payouts_executed",
      expect.objectContaining({ period: "weekly" }),
      "background-job"   // actor must NOT be taken from the request body
    )
  })

  it("logs an unauthorized audit entry when job token is invalid", async () => {
    const { POST } = await loadRoute()
    await POST(postRequest(VALID_BODY, { "x-admin-token": "bad-token" }) as any)

    expect(mockAuditLog).toHaveBeenCalledWith(
      "unauthorized",
      expect.objectContaining({ reason: "invalid_job_token" }),
      "anonymous"
    )
  })
})
