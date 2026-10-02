import { beforeEach, describe, expect, it, vi } from "vitest"

const mockVerifyCallerAuth = vi.fn()
const mockReadCompletions = vi.fn()
const mockWriteCompletions = vi.fn()
const mockGetActiveSeason = vi.fn()
const mockAwardXp = vi.fn()

vi.mock("@/lib/walletAuth", () => ({
  verifyCallerAuth: (...args: unknown[]) => mockVerifyCallerAuth(...args),
}))

vi.mock("@/lib/reviews", () => ({
  readCompletions: (...args: unknown[]) => mockReadCompletions(...args),
  writeCompletions: (...args: unknown[]) => mockWriteCompletions(...args),
}))

vi.mock("@/lib/seasonStore", () => ({
  getActiveSeason: (...args: unknown[]) => mockGetActiveSeason(...args),
}))

vi.mock("@/lib/battlePassStore", () => ({
  XP_PER_HUNT: 100,
  awardXp: (...args: unknown[]) => mockAwardXp(...args),
}))

async function loadRoute() {
  vi.resetModules()
  return import("../route")
}

describe("POST /api/v1/hunts/[id]/complete auth", () => {
  beforeEach(() => {
    mockVerifyCallerAuth.mockReset()
    mockReadCompletions.mockReset()
    mockWriteCompletions.mockReset()
    mockGetActiveSeason.mockReset()
    mockAwardXp.mockReset()

    mockReadCompletions.mockResolvedValue({})
    mockWriteCompletions.mockResolvedValue(undefined)
    mockGetActiveSeason.mockReturnValue(null)
  })

  const body = {
    playerAddress: "GVERIFIED_PLAYER",
  }

  it("returns 401 for unauthenticated caller", async () => {
    mockVerifyCallerAuth.mockResolvedValue({
      authenticated: false,
      authorized: false,
      status: 401,
      error: "Authentication required",
    })

    const { POST } = await loadRoute()
    const req = new Request("http://localhost/api/v1/hunts/1/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })

    const res = await POST(req as any, { params: Promise.resolve({ id: "1" }) } as any)
    expect(res.status).toBe(401)
  })

  it("returns 403 when verified actor differs from player address", async () => {
    mockVerifyCallerAuth.mockResolvedValue({
      authenticated: true,
      authorized: true,
      actor: "GOTHER_VERIFIED_PLAYER",
    })

    const { POST } = await loadRoute()
    const req = new Request("http://localhost/api/v1/hunts/1/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })

    const res = await POST(req as any, { params: Promise.resolve({ id: "1" }) } as any)
    expect(res.status).toBe(403)
  })

  it("accepts completion only for verified player identity", async () => {
    mockVerifyCallerAuth.mockResolvedValue({
      authenticated: true,
      authorized: true,
      actor: "GVERIFIED_PLAYER",
    })

    const { POST } = await loadRoute()
    const req = new Request("http://localhost/api/v1/hunts/1/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })

    const res = await POST(req as any, { params: Promise.resolve({ id: "1" }) } as any)
    expect(res.status).toBe(200)
    expect(mockWriteCompletions).toHaveBeenCalled()
    expect(mockAwardXp).not.toHaveBeenCalled()
  })
})
