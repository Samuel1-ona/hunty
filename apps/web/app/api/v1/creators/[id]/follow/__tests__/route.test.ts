import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AuthError, ForbiddenError } from "@/lib/api/errors"

const CREATOR = "GCREATOR0000000000000000000000000000000000000000000000"
const FOLLOWER = "gverifiedfollower"

const requireVerifiedWalletMock = vi.fn()
vi.mock("@/lib/api/walletAuth", () => ({
  requireVerifiedWallet: requireVerifiedWalletMock,
}))

async function loadRoute() {
  return import("../route")
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

function signedPayload(overrides?: Record<string, unknown>) {
  return { followerWallet: FOLLOWER, challenge: "challenge", signature: "signature", ...overrides }
}

function post(overrides?: Record<string, unknown>) {
  return new Request(`http://localhost/api/v1/creators/${CREATOR}/follow`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-wallet-address": FOLLOWER,
    },
    body: JSON.stringify(signedPayload(overrides)),
  })
}

function del(overrides?: Record<string, unknown>) {
  return new Request(`http://localhost/api/v1/creators/${CREATOR}/follow`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      "x-wallet-address": FOLLOWER,
    },
    body: JSON.stringify(signedPayload(overrides)),
  })
}

function get(followerWallet: string) {
  return new Request(
    `http://localhost/api/v1/creators/${CREATOR}/follow?followerWallet=${encodeURIComponent(followerWallet)}`
  )
}

describe("creators/:id/follow API", () => {
  beforeEach(async () => {
    requireVerifiedWalletMock.mockReset()
    requireVerifiedWalletMock.mockImplementation((req: Request, input: { claimedAddress?: string }) => {
      const wallet = req.headers.get("x-wallet-address")
      if (!wallet) throw new AuthError("Wallet address required")
      if (input.claimedAddress && input.claimedAddress.toLowerCase() !== wallet.toLowerCase()) {
        throw new ForbiddenError("Authenticated wallet does not match requested actor")
      }
      return wallet.toLowerCase()
    })
    const { resetFollowsStore } = await import("@/lib/follows")
    resetFollowsStore()
  })
  afterEach(() => vi.clearAllMocks())

  it("follows a creator via POST", async () => {
    const { POST } = await loadRoute()
    const res = await POST(post() as any, ctx(CREATOR) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.following).toBe(true)
    expect(body.followersCount).toBe(1)
  })

  it("returns 401 when wallet auth header is missing", async () => {
    const { POST } = await loadRoute()
    const payload = signedPayload()
    const res = await POST(
      new Request(`http://localhost/api/v1/creators/${CREATOR}/follow`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }) as any,
      ctx(CREATOR) as any
    )
    expect(res.status).toBe(401)
  })

  it("unfollows via DELETE", async () => {
    const { POST, DELETE } = await loadRoute()
    await POST(post() as any, ctx(CREATOR) as any)
    const res = await DELETE(del() as any, ctx(CREATOR) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.following).toBe(false)
    expect(body.removed).toBe(true)
    expect(body.followersCount).toBe(0)
  })

  it("reports follow status via GET", async () => {
    const { POST, GET } = await loadRoute()
    await POST(post() as any, ctx(CREATOR) as any)
    const res = await GET(get(FOLLOWER) as any, ctx(CREATOR) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.following).toBe(true)
    expect(body.followersCount).toBe(1)
  })

  it("rejects forged follower wallet with 403", async () => {
    const { POST } = await loadRoute()
    const res = await POST(post({ followerWallet: "ganotherwallet" }) as any, ctx(CREATOR) as any)
    expect(res.status).toBe(403)
  })
})
