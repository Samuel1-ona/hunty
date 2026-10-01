import { beforeEach, describe, expect, it, vi } from "vitest"
import { AuthError, ForbiddenError } from "@/lib/api/errors"

const WALLET = "gverifiedwallet"

const upsertEmailPreferenceMock = vi.fn()
const getEmailPreferenceMock = vi.fn()
const requireVerifiedWalletMock = vi.fn()

vi.mock("@/lib/email/dbStore", () => ({
  getEmailPreference: getEmailPreferenceMock,
  upsertEmailPreference: upsertEmailPreferenceMock,
}))
vi.mock("@/lib/api/walletAuth", () => ({
  requireVerifiedWallet: requireVerifiedWalletMock,
}))

describe("/api/v1/email-preferences POST auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireVerifiedWalletMock.mockImplementation((req: Request, input: { claimedAddress?: string }) => {
      const wallet = req.headers.get("x-wallet-address")
      if (!wallet) throw new AuthError("Wallet address required")
      if (input.claimedAddress && input.claimedAddress.toLowerCase() !== wallet.toLowerCase()) {
        throw new ForbiddenError("Authenticated wallet does not match requested actor")
      }
      return wallet.toLowerCase()
    })
    upsertEmailPreferenceMock.mockResolvedValue({
      id: "pref_1",
      walletAddress: WALLET,
      email: "alice@example.com",
      digestSubscribed: true,
      subscriptionDate: Date.now(),
      lastUpdated: Date.now(),
      createdAt: Date.now(),
    })
  })

  it("returns 401 for missing authentication", async () => {
    const { POST } = await import("../route")

    const req = new Request("http://localhost/api/v1/email-preferences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        walletAddress: WALLET,
        email: "alice@example.com",
        digestSubscribed: true,
        challenge: "challenge",
        signature: "signature",
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it("uses verified wallet identity for writes", async () => {
    const { POST } = await import("../route")

    const req = new Request("http://localhost/api/v1/email-preferences", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wallet-address": WALLET,
      },
      body: JSON.stringify({
        walletAddress: WALLET,
        email: "alice@example.com",
        digestSubscribed: true,
        challenge: "challenge",
        signature: "signature",
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)
    expect(upsertEmailPreferenceMock).toHaveBeenCalledWith(WALLET, "alice@example.com", true)
  })

  it("returns 403 when request body claims another wallet", async () => {
    const { POST } = await import("../route")

    const req = new Request("http://localhost/api/v1/email-preferences", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wallet-address": WALLET,
      },
      body: JSON.stringify({
        walletAddress: "ganotherwallet",
        email: "alice@example.com",
        digestSubscribed: true,
        challenge: "challenge",
        signature: "signature",
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(403)
  })
})
