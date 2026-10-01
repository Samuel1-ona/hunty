import { beforeEach, describe, expect, it, vi } from "vitest"

const mockVerifyCallerAuth = vi.fn()
const mockDbGetRoleForWallet = vi.fn()
const mockRecordHuntAudit = vi.fn()
const mockHideHuntsFromPublic = vi.fn()
const mockUnhideHuntsFromPublic = vi.fn()

vi.mock("@/lib/walletAuth", () => ({
  verifyCallerAuth: (...args: unknown[]) => mockVerifyCallerAuth(...args),
}))

vi.mock("@/lib/collaborationDb", () => ({
  dbGetRoleForWallet: (...args: unknown[]) => mockDbGetRoleForWallet(...args),
}))

vi.mock("@/lib/db/huntAuditLog", () => ({
  recordHuntAudit: (...args: unknown[]) => mockRecordHuntAudit(...args),
}))

vi.mock("@/lib/rate-limit", () => ({
  getIP: vi.fn(() => "127.0.0.1"),
  rateLimit: vi.fn(async () => ({ success: true, reset: 0 })),
  rateLimitResponse: vi.fn(),
}))

vi.mock("@/lib/huntStore", () => ({
  hideHuntsFromPublic: (...args: unknown[]) => mockHideHuntsFromPublic(...args),
  unhideHuntsFromPublic: (...args: unknown[]) => mockUnhideHuntsFromPublic(...args),
  getHuntById: vi.fn(() => undefined),
}))

async function loadRoute() {
  vi.resetModules()
  return import("../route")
}

describe("POST /api/v1/hunts/[id]/archive auth", () => {
  beforeEach(() => {
    mockVerifyCallerAuth.mockReset()
    mockDbGetRoleForWallet.mockReset()
    mockRecordHuntAudit.mockReset()
    mockHideHuntsFromPublic.mockReset()
    mockUnhideHuntsFromPublic.mockReset()
  })

  it("returns 401 for unauthenticated caller", async () => {
    mockVerifyCallerAuth.mockResolvedValue({
      authenticated: false,
      authorized: false,
      status: 401,
      error: "Authentication required",
    })

    const { POST } = await loadRoute()
    const req = new Request("http://localhost/api/v1/hunts/1/archive", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "archive", actorAddress: "GUNTRUSTED_BODY_ACTOR" }),
    })

    const res = await POST(req as any, { params: Promise.resolve({ id: "1" }) } as any)
    expect(res.status).toBe(401)
  })

  it("returns 403 for authenticated non-owner caller", async () => {
    mockVerifyCallerAuth.mockResolvedValue({
      authenticated: true,
      authorized: true,
      actor: "GVERIFIED_NON_OWNER_ACTOR_ADDRESS_000000000000000000000000000",
    })
    mockDbGetRoleForWallet.mockResolvedValue("editor")

    const { POST } = await loadRoute()
    const req = new Request("http://localhost/api/v1/hunts/1/archive", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "archive", actorAddress: "GSPOOFED_BODY_ACTOR" }),
    })

    const res = await POST(req as any, { params: Promise.resolve({ id: "1" }) } as any)
    expect(res.status).toBe(403)
  })

  it("uses verified actor identity for audit writes", async () => {
    const verifiedActor = "GVERIFIED_OWNER_ACTOR_ADDRESS_0000000000000000000000000000000"
    mockVerifyCallerAuth.mockResolvedValue({
      authenticated: true,
      authorized: true,
      actor: verifiedActor,
    })
    mockDbGetRoleForWallet.mockResolvedValue("owner")
    mockRecordHuntAudit.mockResolvedValue(undefined)

    const { POST } = await loadRoute()
    const req = new Request("http://localhost/api/v1/hunts/1/archive", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "archive", actorAddress: "GSPOOFED_BODY_ACTOR" }),
    })

    const res = await POST(req as any, { params: Promise.resolve({ id: "1" }) } as any)
    expect(res.status).toBe(200)
    expect(mockHideHuntsFromPublic).toHaveBeenCalledWith([1])
    expect(mockRecordHuntAudit).toHaveBeenCalledWith(1, "hunt archived", verifiedActor, { action: "archive" })
  })
})
