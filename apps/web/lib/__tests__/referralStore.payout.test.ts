import { beforeEach, describe, expect, it } from "vitest"
import {
  _clearReferralStore,
  _injectReferralRecord,
  awardServerReferralBonus,
  getAllPayouts,
  getReferralLeaderboard,
  getReferralLeaderboardStats,
  getReferrerRank,
  processReferralPayouts,
  recordReferral,
  updatePayoutStatus,
  validateReferralEligibility,
} from "@/lib/referralStore"

describe("referralStore payout idempotency & IP anti-self-referral validation", () => {
  const REFERRER_A = "GREFERRER_AAA11111111111111111111111111111111111111111111"
  const REFERRED_B = "GREFERRED_BBB22222222222222222222222222222222222222222222"
  const REFERRED_C = "GREFERRED_CCC33333333333333333333333333333333333333333333"
  const REFERRED_D = "GREFERRED_DDD44444444444444444444444444444444444444444444"

  const REFERRER_IP = "198.51.100.10"
  const LEGIT_PLAYER_IP = "203.0.113.42"
  const LEGIT_PLAYER_IP_2 = "203.0.113.99"
  const IPV6_REFERRER = "2001:db8:3333:4444:5555:6666:7777:8888"
  const IPV6_REFERRED = "2001:db8:3333:4444:5555:6666:7777:9999"

  beforeEach(() => {
    _clearReferralStore()
  })

  describe("Payout and Bonus Idempotency", () => {
    it("ensures awarding the same referral payout/bonus twice has no effect", () => {
      // 1. Initial valid referral
      const initialRecord = recordReferral({
        code: `wallet:${REFERRER_A}`,
        referrerAddress: REFERRER_A,
        referredAddress: REFERRED_B,
        huntId: 10,
        clientIp: LEGIT_PLAYER_IP,
      })
      expect(initialRecord.success).toBe(true)

      // 2. Award bonus first time
      const firstAward = awardServerReferralBonus(REFERRED_B, 10, 50)
      expect(firstAward).not.toBeNull()
      expect(firstAward?.bonusAwarded).toBe(true)
      expect(firstAward?.bonusPoints).toBe(50)
      expect(firstAward?.firstCompletedHuntId).toBe(10)
      const originalCompletedAt = firstAward?.firstCompletedAt
      expect(originalCompletedAt).toBeDefined()

      // Verify stats and leaderboard reflection after first payout
      const statsAfterFirst = getReferralLeaderboardStats()
      expect(statsAfterFirst.totalSuccessfulReferrals).toBe(1)
      expect(statsAfterFirst.totalBonusDistributed).toBe(50)

      const leaderboardAfterFirst = getReferralLeaderboard()
      expect(leaderboardAfterFirst[0].successfulReferrals).toBe(1)
      expect(leaderboardAfterFirst[0].bonusPoints).toBe(50)

      // 3. Award bonus second time for the exact same referral
      const secondAward = awardServerReferralBonus(REFERRED_B, 10, 50)
      expect(secondAward).not.toBeNull()
      expect(secondAward?.bonusAwarded).toBe(true)
      expect(secondAward?.bonusPoints).toBe(50) // points MUST NOT double to 100
      expect(secondAward?.firstCompletedAt).toBe(originalCompletedAt) // timestamp unchanged

      // 4. Award bonus third time with different points/huntId (must be ignored)
      const thirdAward = awardServerReferralBonus(REFERRED_B, 999, 100)
      expect(thirdAward?.bonusPoints).toBe(50)
      expect(thirdAward?.firstCompletedHuntId).toBe(10)

      // 5. Verify stats and leaderboard did not change (idempotency preserved)
      const statsAfterSecond = getReferralLeaderboardStats()
      expect(statsAfterSecond.totalSuccessfulReferrals).toBe(1)
      expect(statsAfterSecond.totalBonusDistributed).toBe(50)

      const leaderboardAfterSecond = getReferralLeaderboard()
      expect(leaderboardAfterSecond[0].successfulReferrals).toBe(1)
      expect(leaderboardAfterSecond[0].bonusPoints).toBe(50)
    })

    it("returns null when attempting to award bonus to an unregistered wallet", () => {
      const result = awardServerReferralBonus("GUNREGISTERED_WALLET", 1, 25)
      expect(result).toBeNull()

      const stats = getReferralLeaderboardStats()
      expect(stats.totalSuccessfulReferrals).toBe(0)
      expect(stats.totalBonusDistributed).toBe(0)
    })

    it("ensures duplicate referral recording for the same wallet is rejected without duplicate payouts", () => {
      const first = recordReferral({
        code: `wallet:${REFERRER_A}`,
        referrerAddress: REFERRER_A,
        referredAddress: REFERRED_B,
      })
      expect(first.success).toBe(true)

      // Second attempt to record the same referred wallet
      const second = recordReferral({
        code: `wallet:${REFERRER_A}`,
        referrerAddress: REFERRER_A,
        referredAddress: REFERRED_B,
      })
      expect(second.success).toBe(false)
      if (!second.success) {
        expect(second.reason).toBe("already_referred")
      }

      // Leaderboard should only count the wallet once
      const board = getReferralLeaderboard()
      expect(board[0].totalInvites).toBe(1)
    })

    it("handles updatePayoutStatus idempotently", () => {
      const allocations = [
        { rank: 1, referrerAddress: REFERRER_A, amount: 500, rewardType: "xlm" as const },
      ]
      const result = processReferralPayouts("weekly", allocations, true)
      expect(result.payouts.length).toBe(1)
      const payoutId = result.payouts[0].id

      // Initial update to paid
      const updated = updatePayoutStatus(payoutId, "paid", "tx_hash_123")
      expect(updated?.status).toBe("paid")
      expect(updated?.txHash).toBe("tx_hash_123")

      // Subsequent identical update has no negative side effects
      const secondUpdate = updatePayoutStatus(payoutId, "paid", "tx_hash_123")
      expect(secondUpdate?.status).toBe("paid")
      expect(secondUpdate?.txHash).toBe("tx_hash_123")

      const allPayouts = getAllPayouts()
      expect(allPayouts.length).toBe(1)
      expect(allPayouts[0].status).toBe("paid")
    })

    it("preserves payout idempotency across multiple distinct referred players", () => {
      // Setup referrals for two distinct players
      recordReferral({
        code: `wallet:${REFERRER_A}`,
        referrerAddress: REFERRER_A,
        referredAddress: REFERRED_B,
        clientIp: LEGIT_PLAYER_IP,
      })
      recordReferral({
        code: `wallet:${REFERRER_A}`,
        referrerAddress: REFERRER_A,
        referredAddress: REFERRED_C,
        clientIp: LEGIT_PLAYER_IP_2,
      })

      // Award bonus for Player B twice
      awardServerReferralBonus(REFERRED_B, 1, 25)
      awardServerReferralBonus(REFERRED_B, 1, 25)

      // Award bonus for Player C once
      awardServerReferralBonus(REFERRED_C, 2, 25)

      const stats = getReferralLeaderboardStats()
      expect(stats.totalSuccessfulReferrals).toBe(2)
      expect(stats.totalBonusDistributed).toBe(50)

      const rank = getReferrerRank(REFERRER_A)
      expect(rank?.successfulReferrals).toBe(2)
      expect(rank?.bonusPoints).toBe(50)
      expect(rank?.totalInvites).toBe(2)
    })
  })

  describe("IP Anti-Self-Referral Validation", () => {
    it("rejects referrals when client IP matches the referrer IP recorded during initial link creation", () => {
      // Referrer initiates referral link with REFERRER_IP
      const setupResult = recordReferral({
        code: `wallet:${REFERRER_A}`,
        referrerAddress: REFERRER_A,
        referredAddress: REFERRED_B,
        clientIp: REFERRER_IP,
      })
      expect(setupResult.success).toBe(true)

      // Another referred wallet attempts to use the referral link from the SAME IP
      const validation = validateReferralEligibility(
        REFERRER_A,
        REFERRED_C,
        REFERRER_IP
      )
      expect(validation).toEqual({ valid: false, reason: "self_referral_ip" })

      // Attempting to record should fail with self_referral_ip
      const recordAttempt = recordReferral({
        code: `wallet:${REFERRER_A}`,
        referrerAddress: REFERRER_A,
        referredAddress: REFERRED_C,
        clientIp: REFERRER_IP,
      })
      expect(recordAttempt.success).toBe(false)
      if (!recordAttempt.success) {
        expect(recordAttempt.reason).toBe("self_referral_ip")
      }

      // Verify second referred wallet was never recorded
      const stats = getReferralLeaderboardStats()
      expect(stats.totalReferrers).toBe(1)
      const board = getReferralLeaderboard()
      expect(board[0].totalInvites).toBe(1) // only initial referral counted
    })

    it("accepts referrals from a different IP address", () => {
      // Referrer initiates with REFERRER_IP
      recordReferral({
        code: `wallet:${REFERRER_A}`,
        referrerAddress: REFERRER_A,
        referredAddress: REFERRED_B,
        clientIp: REFERRER_IP,
      })

      // Legitimate friend connects from distinct IP
      const validation = validateReferralEligibility(
        REFERRER_A,
        REFERRED_C,
        LEGIT_PLAYER_IP
      )
      expect(validation).toEqual({ valid: true })

      const recordAttempt = recordReferral({
        code: `wallet:${REFERRER_A}`,
        referrerAddress: REFERRER_A,
        referredAddress: REFERRED_C,
        clientIp: LEGIT_PLAYER_IP,
      })
      expect(recordAttempt.success).toBe(true)
    })

    it("handles null and undefined clientIp without false-positive self-referral rejections", () => {
      // Referrer registered with an IP
      recordReferral({
        code: `wallet:${REFERRER_A}`,
        referrerAddress: REFERRER_A,
        referredAddress: REFERRED_B,
        clientIp: REFERRER_IP,
      })

      // Client connecting without IP header (e.g. proxy stripped IP)
      const nullIpValidation = validateReferralEligibility(
        REFERRER_A,
        REFERRED_C,
        null
      )
      expect(nullIpValidation).toEqual({ valid: true })

      const undefinedIpValidation = validateReferralEligibility(
        REFERRER_A,
        REFERRED_D,
        undefined
      )
      expect(undefinedIpValidation).toEqual({ valid: true })
    })

    it("validates and rejects self-referral using IPv6 addresses", () => {
      // Register with IPv6
      const reg = recordReferral({
        code: `wallet:${REFERRER_A}`,
        referrerAddress: REFERRER_A,
        referredAddress: REFERRED_B,
        clientIp: IPV6_REFERRER,
      })
      expect(reg.success).toBe(true)

      // Same IPv6 rejected
      const sameIpValidation = validateReferralEligibility(
        REFERRER_A,
        REFERRED_C,
        IPV6_REFERRER
      )
      expect(sameIpValidation).toEqual({ valid: false, reason: "self_referral_ip" })

      // Different IPv6 accepted
      const diffIpValidation = validateReferralEligibility(
        REFERRER_A,
        REFERRED_C,
        IPV6_REFERRED
      )
      expect(diffIpValidation).toEqual({ valid: true })
    })

    it("prioritizes wallet match over IP match in error reporting hierarchy", () => {
      // Same wallet AND same IP
      const result = validateReferralEligibility(
        REFERRER_A,
        REFERRER_A,
        REFERRER_IP
      )
      // Rule 1 (wallet match) is evaluated before Rule 2 (IP match)
      expect(result).toEqual({ valid: false, reason: "self_referral_wallet" })
    })
  })
})
