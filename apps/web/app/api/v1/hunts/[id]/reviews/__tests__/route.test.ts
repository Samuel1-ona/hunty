import { beforeEach, describe, expect, it, vi } from "vitest"
import { AuthError, ForbiddenError } from "@/lib/api/errors"
import { z } from "zod"

const WALLET = "gverifiedreviewer"

let reviewsStore: any[] = []
let completionsStore: Record<number, Record<string, boolean>> = {}
const requireVerifiedWalletMock = vi.fn()

vi.mock("@/lib/reviews", () => ({
  readReviews: vi.fn(async () => reviewsStore),
  writeReviews: vi.fn(async (reviews: any[]) => {
    reviewsStore = reviews
  }),
  readCompletions: vi.fn(async () => completionsStore),
}))
vi.mock("@/lib/api/walletAuth", () => ({
  requireVerifiedWallet: requireVerifiedWalletMock,
}))
vi.mock("@hunty/types/api-schemas", () => ({
  huntReviewBodySchema: z.object({
    playerAddress: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    text: z.string().optional(),
    difficultyRating: z.string().optional(),
  }),
}))

function context(huntId: string) {
  return { params: Promise.resolve({ id: huntId }) }
}

describe("/api/v1/hunts/[id]/reviews POST auth", () => {
  beforeEach(() => {
    reviewsStore = []
    completionsStore = {}
    requireVerifiedWalletMock.mockReset()
    requireVerifiedWalletMock.mockImplementation((req: Request, input: { claimedAddress?: string }) => {
      const wallet = req.headers.get("x-wallet-address")
      if (!wallet) throw new AuthError("Wallet address required")
      if (input.claimedAddress && input.claimedAddress.toLowerCase() !== wallet.toLowerCase()) {
        throw new ForbiddenError("Authenticated wallet does not match requested actor")
      }
      return wallet.toLowerCase()
    })
  })

  it("returns 401 when no authenticated wallet is provided", async () => {
    const { POST } = await import("../route")

    const req = new Request("http://localhost/api/v1/hunts/100/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerAddress: WALLET, rating: 5, challenge: "challenge", signature: "signature" }),
    })

    const res = await POST(req as any, context("100") as any)
    expect(res.status).toBe(401)
  })

  it("returns 403 when body claims a different player wallet", async () => {
    const { POST } = await import("../route")

    const req = new Request("http://localhost/api/v1/hunts/100/reviews", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wallet-address": WALLET,
      },
      body: JSON.stringify({
        playerAddress: "ganotherwallet",
        rating: 5,
        challenge: "challenge",
        signature: "signature",
      }),
    })

    const res = await POST(req as any, context("100") as any)
    expect(res.status).toBe(403)
  })

  it("allows verified players who completed the hunt", async () => {
    const { POST } = await import("../route")
    completionsStore = { 100: { [WALLET]: true } }

    const req = new Request("http://localhost/api/v1/hunts/100/reviews", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wallet-address": WALLET,
      },
      body: JSON.stringify({
        playerAddress: WALLET,
        rating: 5,
        text: "Great",
        challenge: "challenge",
        signature: "signature",
      }),
    })

    const res = await POST(req as any, context("100") as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.playerAddress).toBe(WALLET)
    expect(reviewsStore).toHaveLength(1)
  })
})
