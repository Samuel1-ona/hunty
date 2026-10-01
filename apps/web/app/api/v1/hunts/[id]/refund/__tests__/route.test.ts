import { beforeEach, describe, expect, it, vi } from "vitest"

const mockVerifyCallerAuth = vi.fn()
const mockGetHunt = vi.fn()
const mockRefundUnclaimedRewards = vi.fn()
const mockRecordHuntAudit = vi.fn()

vi.mock("@/lib/walletAuth", () => ({
  verifyCallerAuth: (...args: unknown[]) => mockVerifyCallerAuth(...args),
}))

vi.mock("@/lib/huntStore", () => ({
  getHunt: (...args: unknown[]) => mockGetHunt(...args),
}))

vi.mock("@/lib/contracts/rewardManager", () => ({
  refundUnclaimedRewards: (...args: unknown[]) => mockRefundUnclaimedRewards(...args),
}))

vi.mock("@/lib/db/huntAuditLog", () => ({
  recordHuntAudit: (...args: unknown[]) => mockRecordHuntAudit(...args),
}))

vi.mock("@/lib/rate-limit", () => ({
  getIP: vi.fn(() => "127.0.0.1"),
  rateLimit: vi.fn(async () => ({ success: true, reset: 0 })),
  rateLimitPresets: { sensitive: "sensitive" },
  rateLimitResponse: vi.fn(),
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}))

async function loadRoute() {
  vi.resetModules()
  return import("../route")
}

function createRequest(creatorAddress: string) {
  return new Request("http://localhost/api/v1/hunts/1/refund", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ creatorAddress }),
  })
}

describe("POST /api/v1/hunts/[id]/refund auth", () => {
  const verifiedCreator = "GVERIFIED_CREATOR_ADDRESS"

  beforeEach(() => {
    mockVerifyCallerAuth.mockReset()
    mockGetHunt.mockReset()
    mockRefundUnclaimedRewards.mockReset()
    mockRecordHuntAudit.mockReset()

    mockGetHunt.mockReturnValue({
      id: 1,
      creator: verifiedCreator,
      status: "Ended",
      gracePeriodSeconds: 120,
    })
    mockRefundUnclaimedRewards.mockResolvedValue({ amount: 25, txHash: "tx-refund" })
    mockRecordHuntAudit.mockResolvedValue(undefined)
  })

  it("returns 401 for an unauthenticated caller", async () => {
    mockVerifyCallerAuth.mockResolvedValue({
      authenticated: false,
      authorized: false,
      status: 401,
      error: "Authentication required",
    })

    const { POST } = await loadRoute()
    const response = await POST(createRequest(verifiedCreator) as any, {
      params: Promise.resolve({ id: "1" }),
    } as any)

    expect(response.status).toBe(401)
    expect(mockRefundUnclaimedRewards).not.toHaveBeenCalled()
  })

  it("returns 403 when the verified caller is not the hunt creator", async () => {
    mockVerifyCallerAuth.mockResolvedValue({
      authenticated: true,
      authorized: true,
      actor: "GOTHER_VERIFIED_WALLET",
    })

    const { POST } = await loadRoute()
    const response = await POST(createRequest(verifiedCreator) as any, {
      params: Promise.resolve({ id: "1" }),
    } as any)

    expect(response.status).toBe(403)
    expect(mockRefundUnclaimedRewards).not.toHaveBeenCalled()
  })

  it("uses the verified creator as the refund recipient, ignoring the body address", async () => {
    mockVerifyCallerAuth.mockResolvedValue({
      authenticated: true,
      authorized: true,
      actor: verifiedCreator,
    })

    const { POST } = await loadRoute()
    const response = await POST(createRequest("GSPOOFED_BODY_ADDRESS") as any, {
      params: Promise.resolve({ id: "1" }),
    } as any)

    expect(response.status).toBe(200)
    expect(mockRefundUnclaimedRewards).toHaveBeenCalledWith(1, verifiedCreator, 120)
    expect(mockRecordHuntAudit).toHaveBeenCalledWith(1, "hunt refund", verifiedCreator, {
      amount: 25,
      txHash: "tx-refund",
    })
  })
})