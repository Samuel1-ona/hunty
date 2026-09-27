import { beforeEach, describe, expect, it } from "vitest"
import {
  _clearReferralStore,
  _injectReferralRecord,
  awardServerReferralBonus,
  getReferralLeaderboard,
  getReferralLeaderboardStats,
  getReferrerRank,
  processReferralPayouts,
  recordReferral,
  validateReferralEligibility,
} from "@/lib/referralStore"

describe("referralStore", () => {
  beforeEach(() => {
    _clearReferralStore()
  })

  describe("validateReferralEligibility", () => {
    it("rejects when referrer and referred addresses are identical (wallet match)", () => {
      const addr = "GREFERRER1111111111111111111111111111111111111111111111"
      const result = validateReferralEligibility(addr, addr)
      expect(result).toEqual({ valid: false, reason: "self_referral_wallet" })
    })

    it("rejects when referred IP matches the referrer's IP", () => {
      const referrer = "GREFERRER1111111111111111111111111111111111111111111111"
      const referred = "GPLAYER2222222222222222222222222222222222222222222222"

      // Record first referral to set referrer's IP
      recordReferral({
        code: `wallet:${referrer}`,
        referrerAddress: referrer,
        referredAddress: referred,
        clientIp: "192.168.1.100",
      })

      // Attempt second referral from the same IP
      const secondReferred = "GPLAYER3333333333333333333333333333333333333333333333"
      const result = validateReferralEligibility(referrer, secondReferred, "192.168.1.100")
      expect(result).toEqual({ valid: false, reason: "self_referral_ip" })
    })

    it("rejects when referred session ID matches the referrer's session ID", () => {
      const referrer = "GREFERRER1111111111111111111111111111111111111111111111"
      const referred = "GPLAYER2222222222222222222222222222222222222222222222"

      recordReferral({
        code: `wallet:${referrer}`,
        referrerAddress: referrer,
        referredAddress: referred,
        sessionId: "sess-abc-123",
      })

      const secondReferred = "GPLAYER3333333333333333333333333333333333333333333333"
      const result = validateReferralEligibility(referrer, secondReferred, null, "sess-abc-123")
      expect(result).toEqual({ valid: false, reason: "self_referral_session" })
    })

    it("rejects duplicate referrals for an already-referred wallet", () => {
      const referrer = "GREFERRER1111111111111111111111111111111111111111111111"
      const referred = "GPLAYER2222222222222222222222222222222222222222222222"

      recordReferral({
        code: `wallet:${referrer}`,
        referrerAddress: referrer,
        referredAddress: referred,
      })

      const result = validateReferralEligibility("GOTHERREFERRER", referred)
      expect(result).toEqual({ valid: false, reason: "already_referred" })
    })
  })

  describe("recordReferral", () => {
    it("successfully creates a new pending referral record", () => {
      const referrer = "GREFERRER1111111111111111111111111111111111111111111111"
      const referred = "GPLAYER2222222222222222222222222222222222222222222222"

      const res = recordReferral({
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
    it("awards bonus points to referrer upon first completion and is idempotent", () => {
      const referrer = "GREFERRER1111111111111111111111111111111111111111111111"
      const referred = "GPLAYER2222222222222222222222222222222222222222222222"

      recordReferral({
        code: `wallet:${referrer}`,
        referrerAddress: referrer,
        referredAddress: referred,
      })

      const firstCall = awardServerReferralBonus(referred, 42, 50)
      expect(firstCall?.bonusAwarded).toBe(true)
      expect(firstCall?.bonusPoints).toBe(50)

      // Subsequent call does not duplicate award
      const secondCall = awardServerReferralBonus(referred, 42, 50)
      expect(secondCall?.bonusPoints).toBe(50)
    })
  })

  describe("getReferralLeaderboard & getReferrerRank", () => {
    it("ranks referrers by successful referrals descending and then bonus points", () => {
      const refA = "GREFERRER_A"
      const refB = "GREFERRER_B"

      // Injects records for Referrer A (2 successful, 50 bonus pts total)
      _injectReferralRecord({
        code: `wallet:${refA}`,
        referrerAddress: refA,
        referredAddress: "GPLAYER_1",
        registeredAt: Date.now() - 1000,
        bonusAwarded: true,
        bonusPoints: 25,
      })
      _injectReferralRecord({
        code: `wallet:${refA}`,
        referrerAddress: refA,
        referredAddress: "GPLAYER_2",
        registeredAt: Date.now() - 500,
        bonusAwarded: true,
        bonusPoints: 25,
      })

      // Injects record for Referrer B (1 successful, 25 bonus pts)
      _injectReferralRecord({
        code: `wallet:${refB}`,
        referrerAddress: refB,
        referredAddress: "GPLAYER_3",
        registeredAt: Date.now() - 800,
        bonusAwarded: true,
        bonusPoints: 25,
      })

      const board = getReferralLeaderboard()
      expect(board.length).toBe(2)
      expect(board[0].referrerAddress).toBe(refA)
      expect(board[0].rank).toBe(1)
      expect(board[0].successfulReferrals).toBe(2)
      expect(board[1].referrerAddress).toBe(refB)
      expect(board[1].rank).toBe(2)

      const rankA = getReferrerRank(refA)
      expect(rankA?.rank).toBe(1)
    })
  })

  describe("processReferralPayouts", () => {
    it("creates payout allocations on dry run and stores records on execute", () => {
      const refA = "GREFERRER_A"
      const allocations = [
        { rank: 1, referrerAddress: refA, amount: 750, rewardType: "points" as const },
      ]

      const dryRun = processReferralPayouts("weekly", allocations, false)
      expect(dryRun.dryRun).toBe(true)
      expect(dryRun.payouts.length).toBe(1)
      expect(dryRun.payouts[0].status).toBe("pending")

      const executed = processReferralPayouts("weekly", allocations, true)
      expect(executed.dryRun).toBe(false)
      expect(executed.payouts.length).toBe(1)
      expect(executed.payouts[0].status).toBe("pending")
    })
  })
})
