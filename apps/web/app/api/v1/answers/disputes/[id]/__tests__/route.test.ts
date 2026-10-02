import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { GET, PATCH } from "../route"
import * as walletAuth from "@/lib/walletAuth"
import * as answerDisputes from "@/lib/answerDisputes"
import * as huntStore from "@/lib/huntStore"

vi.mock("@/lib/answerDisputes", () => ({
  getAnswerDisputeById: vi.fn(),
  getAnswerDisputeAuditLog: vi.fn(),
  resolveAnswerDispute: vi.fn(),
}))

vi.mock("@/lib/huntStore", () => ({
  getHuntById: vi.fn(),
}))

describe("/api/v1/answers/disputes/[id] authentication & authorization", () => {
  const creatorAddress = "GBRPYHIL2CI3FNQ4BXLFMNDLFPPPU2HY52WSGROMKTCVLA5WDWZTVLTC"
  const nonCreatorAddress = "GOTHERUSER1234567890123456789012345678901234567890123456"
  const sig = "valid_test_signature"
  const challenge = "hunty_dispute_challenge_123"

  const mockDispute = {
    id: "dispute-1",
    answerId: "answer-100",
    huntId: 42,
    clueId: 1,
    playerWallet: "GPLAYER123",
    submittedAnswer: "wrong answer",
    status: "pending",
    submittedAt: Date.now(),
    auditTrail: [],
  }

  const mockHunt = {
    id: 42,
    title: "Test Hunt",
    creator: creatorAddress,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(answerDisputes.getAnswerDisputeById).mockReturnValue(mockDispute as any)
    vi.mocked(answerDisputes.getAnswerDisputeAuditLog).mockReturnValue([])
    vi.mocked(huntStore.getHuntById).mockReturnValue(mockHunt as any)
  })

  describe("GET /api/v1/answers/disputes/[id]", () => {
    it("returns 404 if dispute not found", async () => {
      vi.mocked(answerDisputes.getAnswerDisputeById).mockReturnValue(null)
      const req = new NextRequest("http://localhost:3000/api/v1/answers/disputes/nonexistent")
      const res = await GET(req)
      expect(res.status).toBe(404)
    })

    it("returns dispute details if found", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/answers/disputes/dispute-1")
      const res = await GET(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.dispute).toEqual(mockDispute)
    })
  })

  describe("PATCH /api/v1/answers/disputes/[id]", () => {
    it("returns 401 Unauthorized for unauthenticated caller (no auth provided)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/answers/disputes/dispute-1", {
        method: "PATCH",
        body: JSON.stringify({ decision: "approved" }),
      })
      const res = await PATCH(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toMatch(/Authentication required/i)
    })

    it("returns 401 Unauthorized for invalid wallet signature", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/answers/disputes/dispute-1", {
        method: "PATCH",
        headers: {
          "x-wallet-address": creatorAddress,
          "x-wallet-signature": "invalid_sig",
          "x-wallet-challenge": challenge,
        },
        body: JSON.stringify({ decision: "approved" }),
      })
      const res = await PATCH(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toMatch(/Invalid wallet signature/i)
    })

    it("returns 403 Forbidden when authenticated caller is not the hunt creator", async () => {
      vi.spyOn(walletAuth, "verifyWalletSignature").mockReturnValue(true)

      const req = new NextRequest("http://localhost:3000/api/v1/answers/disputes/dispute-1", {
        method: "PATCH",
        headers: {
          "x-wallet-address": nonCreatorAddress,
          "x-wallet-signature": sig,
          "x-wallet-challenge": challenge,
        },
        body: JSON.stringify({ decision: "approved" }),
      })

      const res = await PATCH(req)
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toMatch(/Forbidden: only the hunt creator can resolve disputes/i)
    })

    it("returns 200 OK when authenticated caller is the hunt creator and derives actor from verified identity", async () => {
      vi.spyOn(walletAuth, "verifyWalletSignature").mockReturnValue(true)
      vi.mocked(answerDisputes.resolveAnswerDispute).mockReturnValue({
        ...mockDispute,
        status: "approved",
        reviewedBy: creatorAddress,
      } as any)

      const req = new NextRequest("http://localhost:3000/api/v1/answers/disputes/dispute-1", {
        method: "PATCH",
        headers: {
          "x-wallet-address": creatorAddress,
          "x-wallet-signature": sig,
          "x-wallet-challenge": challenge,
        },
        body: JSON.stringify({ decision: "approved", note: "Approved by creator" }),
      })

      const res = await PATCH(req)
      expect(res.status).toBe(200)
      expect(answerDisputes.resolveAnswerDispute).toHaveBeenCalledWith("dispute-1", {
        reviewer: creatorAddress,
        decision: "approved",
        note: "Approved by creator",
      })
    })

    it("returns 200 OK when authenticating with valid session token", async () => {
      vi.mocked(answerDisputes.resolveAnswerDispute).mockReturnValue({
        ...mockDispute,
        status: "approved",
        reviewedBy: "sess_admin_123",
      } as any)

      const req = new NextRequest("http://localhost:3000/api/v1/answers/disputes/dispute-1", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer sess_admin_123",
        },
        body: JSON.stringify({ decision: "approved" }),
      })

      const res = await PATCH(req)
      expect(res.status).toBe(200)
      expect(answerDisputes.resolveAnswerDispute).toHaveBeenCalledWith("dispute-1", {
        reviewer: "sess_admin_123",
        decision: "approved",
        note: undefined,
      })
    })

    it("returns 404 when dispute ID does not exist", async () => {
      vi.mocked(answerDisputes.getAnswerDisputeById).mockReturnValue(null)

      const req = new NextRequest("http://localhost:3000/api/v1/answers/disputes/nonexistent", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer sess_admin_123",
        },
        body: JSON.stringify({ decision: "approved" }),
      })

      const res = await PATCH(req)
      expect(res.status).toBe(404)
    })
  })
})
