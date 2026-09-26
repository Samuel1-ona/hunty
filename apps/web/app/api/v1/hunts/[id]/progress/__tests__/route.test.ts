import { beforeEach, describe, expect, it, vi } from "vitest"

const mockVerifyCallerAuth = vi.fn()
const mockSavePlayerProgress = vi.fn()

vi.mock("@/lib/walletAuth", () => ({
  verifyCallerAuth: (...args: unknown[]) => mockVerifyCallerAuth(...args),
}))

vi.mock("@/lib/rate-limit", () => ({
  getIP: vi.fn(() => "127.0.0.1"),
  rateLimit: vi.fn(async () => ({ success: true, reset: 0 })),
  rateLimitResponse: vi.fn(),
}))

vi.mock("@/lib/progressData", () => ({
  getPlayerProgress: vi.fn(),
  savePlayerProgress: (...args: unknown[]) => mockSavePlayerProgress(...args),
}))

async function loadRoute() {
  vi.resetModules()
  return import("../route")
}

describe("POST /api/v1/hunts/[id]/progress auth", () => {
  beforeEach(() => {
    mockVerifyCallerAuth.mockReset()
    mockSavePlayerProgress.mockReset()
    mockSavePlayerProgress.mockReturnValue({
      huntId: 1,
      wallet: "GVERIFIED_PLAYER",
      currentClueIndex: 1,
      totalClues: 3,
      totalPoints: 10,
      completedClueIds: [1],
      completed: false,
    })
  })

  const body = {
    wallet: "GVERIFIED_PLAYER",
    currentClueIndex: 1,
    totalClues: 3,
    totalPoints: 10,
    completedClueIds: [1],
    completed: false,
  }

  it("returns 401 for unauthenticated caller", async () => {
    mockVerifyCallerAuth.mockResolvedValue({
      authenticated: false,
      authorized: false,
      status: 401,
      error: "Authentication required",
    })

    const { POST } = await loadRoute()
    const req = new Request("http://localhost/api/v1/hunts/1/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })

    const res = await POST(req as any, { params: Promise.resolve({ id: "1" }) } as any)
    expect(res.status).toBe(401)
  })

  it("returns 403 when verified actor differs from body wallet", async () => {
    mockVerifyCallerAuth.mockResolvedValue({
      authenticated: true,
      authorized: true,
      actor: "GOTHER_VERIFIED_PLAYER",
    })

    const { POST } = await loadRoute()
    const req = new Request("http://localhost/api/v1/hunts/1/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })

    const res = await POST(req as any, { params: Promise.resolve({ id: "1" }) } as any)
    expect(res.status).toBe(403)
  })

  it("accepts progress updates only for the verified player", async () => {
    mockVerifyCallerAuth.mockResolvedValue({
      authenticated: true,
      authorized: true,
      actor: "GVERIFIED_PLAYER",
    })

    const { POST } = await loadRoute()
    const req = new Request("http://localhost/api/v1/hunts/1/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })

    const res = await POST(req as any, { params: Promise.resolve({ id: "1" }) } as any)
    expect(res.status).toBe(200)
    expect(mockSavePlayerProgress).toHaveBeenCalledWith(1, "GVERIFIED_PLAYER", 1, 3, 10, [1], false)
  })
})
