import { beforeEach, describe, expect, it, vi } from "vitest"
import { AuthError, ForbiddenError } from "@/lib/api/errors"

const WALLET = "ghelpfulvoter"

let reviewsStore: any[] = []
const requireVerifiedWalletMock = vi.fn()

vi.mock("@/lib/reviews", () => ({
  readReviews: vi.fn(async () => reviewsStore),
  writeReviews: vi.fn(async (reviews: any[]) => {
    reviewsStore = reviews
  }),
}))
vi.mock("@/lib/api/walletAuth", () => ({
  requireVerifiedWallet: requireVerifiedWalletMock,
}))

function context(huntId: string, reviewId: string) {
  return { params: Promise.resolve({ id: huntId, reviewId }) }
}

function voteRequest(wallet: string, playerAddress = wallet) {
  return new Request("http://localhost/api/v1/hunts/100/reviews/review-1/helpful", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-wallet-address": wallet,
    },
    body: JSON.stringify({
      playerAddress,
      challenge: "challenge",
      signature: "signature",
    }),
  })
}

describe("/api/v1/hunts/[id]/reviews/[reviewId]/helpful POST auth", () => {
  const reviewId = "review-1"

  beforeEach(() => {
    requireVerifiedWalletMock.mockReset()
    requireVerifiedWalletMock.mockImplementation((req: Request, input: { claimedAddress?: string }) => {
      const wallet = req.headers.get("x-wallet-address")
      if (!wallet) throw new AuthError("Wallet address required")
      if (input.claimedAddress && input.claimedAddress.toLowerCase() !== wallet.toLowerCase()) {
        throw new ForbiddenError("Authenticated wallet does not match requested actor")
      }
      return wallet.toLowerCase()
    })
    reviewsStore = [
      {
        id: reviewId,
        huntId: 100,
        playerAddress: "gplayer",
        rating: 4,
        text: "Nice",
        upvotes: 0,
        upvotedBy: [],
        createdAt: Date.now(),
      },
    ]
  })

  it("returns 401 when no authenticated wallet is provided", async () => {
    const { POST } = await import("../route")
    const req = new Request("http://localhost/api/v1/hunts/100/reviews/review-1/helpful", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerAddress: WALLET, challenge: "challenge", signature: "signature" }),
    })

    const res = await POST(req as any, context("100", reviewId) as any)
    expect(res.status).toBe(401)
  })

  it("returns 403 when body claims another voter wallet", async () => {
    const { POST } = await import("../route")
    const req = voteRequest(WALLET, "ganotherwallet")

    const res = await POST(req as any, context("100", reviewId) as any)
    expect(res.status).toBe(403)
  })

  it("stores a single vote per verified user", async () => {
    const { POST } = await import("../route")
    const first = await POST(voteRequest(WALLET) as any, context("100", reviewId) as any)
    expect(first.status).toBe(200)
    expect(reviewsStore[0].upvotes).toBe(1)

    const second = await POST(voteRequest(WALLET) as any, context("100", reviewId) as any)
    expect(second.status).toBe(200)
    expect(reviewsStore[0].upvotes).toBe(1)
  })
})
