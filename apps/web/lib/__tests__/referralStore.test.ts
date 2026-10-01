import { beforeEach, describe, expect, it, vi } from "vitest"
import { createMockSql, resetTables, type Row } from "@/lib/test-utils/mockSql"
import {
  _injectReferralRecord,
  awardServerReferralBonus,
  getReferralLeaderboard,
  getReferrerRank,
  processReferralPayouts,
  recordReferral,
  validateReferralEligibility,
} from "@/lib/referralStore"

// ---------------------------------------------------------------------------
// In-memory table store — shared across all queries in a single test.
// ---------------------------------------------------------------------------

const tables: Record<string, Row[]> = {
  referrals: [],
  referrer_devices: [],
  referral_payouts: [],
}

const mockSql = createMockSql(tables)

vi.mock("@/lib/db", () => ({
  getDb: () => mockSql,
}))

describe("referralStore", () => {
  beforeEach(() => {
    resetTables(tables)
  })

  describe("validateReferralEligibility", () => {
    it("rejects when referrer and referred addresses are identical (wallet match)", async () => {
      const addr = "GREFERRER1111111111111111111111111111111111111111111111"
      const result = await validateReferralEligibility(addr, addr)
      expect(result).toEqual({ valid: false, reason: "self_referral_wallet" })
    })

    it("rejects when referred IP matches the referrer's IP", async () => {
      const referrer = "GREFERRER1111111111111111111111111111111111111111111111"
      const referred = "GPLAYER2222222222222222222222222222222222222222222222"

      // Record first referral to set referrer's IP
      await recordReferral({
        code: `wallet:${referrer}`,
        referrerAddress: referrer,
        referredAddress: referred,
        clientIp: "192.168.1.100",
      })

      // Attempt second referral from the same IP
      const secondReferred = "GPLAYER3333333333333333333333333333333333333333333333"
      const result = await validateReferralEligibility(referrer, secondReferred, "192.168.1.100")
      expect(result).toEqual({ valid: false, reason: "self_referral_ip" })
    })

    it("rejects when referred session ID matches the referrer's session ID", async () => {
      const referrer = "GREFERRER1111111111111111111111111111111111111111111111"
      const referred = "GPLAYER2222222222222222222222222222222222222222222222"

      await recordReferral({
        code: `wallet:${referrer}`,
        referrerAddress: referrer,
        referredAddress: referred,
        sessionId: "sess-abc-123",
      })

      const secondReferred = "GPLAYER3333333333333333333333333333333333333333333333"
      const result = await validateReferralEligibility(referrer, secondReferred, null, "sess-abc-123")
      expect(result).toEqual({ valid: false, reason: "self_referral_session" })
    })

    it("rejects duplicate referrals for an already-referred wallet", async () => {
      const referrer = "GREFERRER1111111111111111111111111111111111111111111111"
      const referred = "GPLAYER2222222222222222222222222222222222222222222222"

      await recordReferral({
        code: `wallet:${referrer}`,
        referrerAddress: referrer,
        referredAddress: referred,
      })

      const result = await validateReferralEligibility("GOTHERREFERRER", referred)
      expect(result).toEqual({ valid: false, reason: "already_referred" })
    })
  })

  describe("recordReferral", () => {
    it("successfully creates a new pending referral record", async () => {
      const referrer = "GREFERRER1111111111111111111111111111111111111111111111"
      const referred = "GPLAYER2222222222222222222222222222222222222222222222"

      const res = await recordReferral({
        code: `wallet:${referrer}`,
        referrerAddress: referrer,
        referredAddress: referred,
        huntId: 10,
      })

      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.record.referrerAddress).toBe(referrer)
        expect(res.record.referredAddress).toBe(referred)
        expect(res.record.bonusAwarded).toBe(false)
        expect(res.record.firstCompletedHuntId).toBe(10)
      }
    })
  })

  describe("awardServerReferralBonus", () => {
    it("awards bonus points to referrer upon first completion and is idempotent", async () => {
      const referrer = "GREFERRER1111111111111111111111111111111111111111111111"
      const referred = "GPLAYER2222222222222222222222222222222222222222222222"

      await recordReferral({
        code: `wallet:${referrer}`,
        referrerAddress: referrer,
        referredAddress: referred,
      })

      const firstCall = await awardServerReferralBonus(referred, 42, 50)
      expect(firstCall?.bonusAwarded).toBe(true)
      expect(firstCall?.bonusPoints).toBe(50)

      // Subsequent call does not duplicate award
      const secondCall = await awardServerReferralBonus(referred, 42, 50)
      expect(secondCall?.bonusPoints).toBe(50)
    })
  })

  describe("getReferralLeaderboard & getReferrerRank", () => {
    it("ranks referrers by successful referrals descending and then bonus points", async () => {
      const refA = "GREFERRER_A"
      const refB = "GREFERRER_B"

      // Injects records for Referrer A (2 successful, 50 bonus pts total)
      await _injectReferralRecord({
        code: `wallet:${refA}`,
        referrerAddress: refA,
        referredAddress: "GPLAYER_1",
        registeredAt: Date.now() - 1000,
        bonusAwarded: true,
        bonusPoints: 25,
      })
      await _injectReferralRecord({
        code: `wallet:${refA}`,
        referrerAddress: refA,
        referredAddress: "GPLAYER_2",
        registeredAt: Date.now() - 500,
        bonusAwarded: true,
        bonusPoints: 25,
      })

      // Injects record for Referrer B (1 successful, 25 bonus pts)
      await _injectReferralRecord({
        code: `wallet:${refB}`,
        referrerAddress: refB,
        referredAddress: "GPLAYER_3",
        registeredAt: Date.now() - 800,
        bonusAwarded: true,
        bonusPoints: 25,
      })

      const board = await getReferralLeaderboard()
      expect(board.length).toBe(2)
      expect(board[0].referrerAddress).toBe(refA)
      expect(board[0].rank).toBe(1)
      expect(board[0].successfulReferrals).toBe(2)
      expect(board[1].referrerAddress).toBe(refB)
      expect(board[1].rank).toBe(2)

      const rankA = await getReferrerRank(refA)
      expect(rankA?.rank).toBe(1)
    })
  })

  describe("processReferralPayouts", () => {
    it("creates payout allocations on dry run and stores records on execute", async () => {
      const refA = "GREFERRER_A"
      const allocations = [
        { rank: 1, referrerAddress: refA, amount: 750, rewardType: "points" as const },
      ]

      const dryRun = await processReferralPayouts("weekly", allocations, false)
      expect(dryRun.dryRun).toBe(true)
      expect(dryRun.payouts.length).toBe(1)
      expect(dryRun.payouts[0].status).toBe("pending")

      const executed = await processReferralPayouts("weekly", allocations, true)
      expect(executed.dryRun).toBe(false)
      expect(executed.payouts.length).toBe(1)
      expect(executed.payouts[0].status).toBe("pending")
    })
  })
})