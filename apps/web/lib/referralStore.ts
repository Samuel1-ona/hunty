/**
 * Server-side referral store for the referral leaderboard and rewards system.
 *
 * Responsibilities:
 *  - Record incoming referrals with strict anti-self-referral validation
 *    (wallet address match, IP address match, session ID match).
 *  - Build a ranked referral leaderboard from stored records.
 *  - Process reward payout allocations for top referrers.
 *
 * Storage: in-memory Map (process-scoped, suitable for edge runtime / serverless
 * cold starts). In production this would be replaced by a database layer.
 */

import type {
  ReferralLeaderboardEntry,
  ReferralLeaderboardPeriod,
  ReferralLeaderboardStats,
  ReferralPayoutRecord,
  ReferralPayoutStatus,
  ReferralRecord,
} from "@/lib/types"

// ─── In-memory stores ─────────────────────────────────────────────────────────

/** All referral records, keyed by referredAddress (one record per referred wallet). */
const referralMap = new Map<string, ReferralRecord>()

/** All payout records, keyed by payout ID. */
const payoutMap = new Map<string, ReferralPayoutRecord>()

/**
 * Tracks the IP address used when each referrer first created their referral link.
 * Key: referrerAddress (normalised), Value: IP string.
 */
const referrerIpMap = new Map<string, string>()

/**
 * Tracks the session ID used when each referrer created their referral link.
 * Key: referrerAddress (normalised), Value: session ID string.
 */
const referrerSessionMap = new Map<string, string>()

// ─── Anti-self-referral validation ───────────────────────────────────────────

export type ReferralValidationResult =
  | { valid: true }
  | { valid: false; reason: "self_referral_wallet" | "self_referral_ip" | "self_referral_session" | "already_referred" | "invalid_code" }

/**
 * Validates a referral attempt against all anti-self-referral rules.
 *
 * Rules checked (in order):
 * 1. Wallet address match — referrer and referred must differ.
 * 2. IP address match — referred's IP must not match the recorded referrer IP.
 * 3. Session ID match — referred's session must not match the referrer session.
 * 4. Duplicate referral — the referred wallet must not already have a record.
 */
export function validateReferralEligibility(
  referrerAddress: string,
  referredAddress: string,
  clientIp?: string | null,
  sessionId?: string | null
): ReferralValidationResult {
  const normReferrer = normaliseAddress(referrerAddress)
  const normReferred = normaliseAddress(referredAddress)

  // Rule 1: wallet match
  if (normReferrer === normReferred) {
    return { valid: false, reason: "self_referral_wallet" }
  }

  // Rule 2: IP match
  if (clientIp) {
    const referrerIp = referrerIpMap.get(normReferrer)
    if (referrerIp && referrerIp === clientIp) {
      return { valid: false, reason: "self_referral_ip" }
    }
  }

  // Rule 3: session ID match
  if (sessionId) {
    const referrerSession = referrerSessionMap.get(normReferrer)
    if (referrerSession && referrerSession === sessionId) {
      return { valid: false, reason: "self_referral_session" }
    }
  }

  // Rule 4: already referred
  if (referralMap.has(normReferred)) {
    return { valid: false, reason: "already_referred" }
  }

  return { valid: true }
}

// ─── Record management ────────────────────────────────────────────────────────

function normaliseAddress(address: string): string {
  return address.trim()
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export interface RecordReferralOptions {
  code: string
  referrerAddress: string
  referredAddress: string
  huntId?: number
  /** Client IP of the referred player (extracted by the API route). */
  clientIp?: string | null
  /** Browser session ID of the referred player. */
  sessionId?: string | null
}

/**
 * Records a validated referral. Returns the new record, or a validation error.
 * This function is idempotent: if the referred wallet already has a record the
 * existing record is returned without modification.
 */
export function recordReferral(
  opts: RecordReferralOptions
): { success: true; record: ReferralRecord } | { success: false; reason: string } {
  const referrerAddress = normaliseAddress(opts.referrerAddress)
  const referredAddress = normaliseAddress(opts.referredAddress)

  const validation = validateReferralEligibility(
    referrerAddress,
    referredAddress,
    opts.clientIp,
    opts.sessionId
  )

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  // Store the referrer's IP and session so future referred wallets from the same
  // device/session can be blocked.
  if (opts.clientIp) referrerIpMap.set(referrerAddress, opts.clientIp)
  if (opts.sessionId) referrerSessionMap.set(referrerAddress, opts.sessionId)

  const record: ReferralRecord = {
    code: opts.code,
    referrerAddress,
    referredAddress,
    registeredAt: Date.now(),
    bonusAwarded: false,
    bonusPoints: 0,
    ...(opts.huntId !== undefined ? { firstCompletedHuntId: opts.huntId } : {}),
  }

  referralMap.set(referredAddress, record)
  return { success: true, record }
}

/**
 * Marks the referred player's first hunt completion and awards bonus points
 * to the referrer record. Idempotent — does nothing if already awarded.
 */
export function awardServerReferralBonus(
  referredAddress: string,
  huntId: number,
  bonusPoints = 25
): ReferralRecord | null {
  const normReferred = normaliseAddress(referredAddress)
  const record = referralMap.get(normReferred)
  if (!record || record.bonusAwarded) return record ?? null

  const updated: ReferralRecord = {
    ...record,
    bonusAwarded: true,
    bonusPoints,
    firstCompletedAt: Date.now(),
    firstCompletedHuntId: huntId,
  }
  referralMap.set(normReferred, updated)
  return updated
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

function periodCutoff(period: ReferralLeaderboardPeriod): number {
  const now = Date.now()
  if (period === "week") return now - 7 * 24 * 60 * 60 * 1000
  if (period === "month") return now - 30 * 24 * 60 * 60 * 1000
  return 0
}

/**
 * Builds the referral leaderboard from all stored records.
 *
 * Ranking rules (descending priority):
 *  1. successfulReferrals (most wins)
 *  2. bonusPoints (most points)
 *  3. lastActiveAt of the most recent referral (earliest)
 *
 * Ties in positions 1 & 2 share a rank (standard competition ranking).
 */
export function getReferralLeaderboard(
  options: {
    period?: ReferralLeaderboardPeriod
    limit?: number
  } = {}
): ReferralLeaderboardEntry[] {
  const { period = "all", limit = 50 } = options
  const cutoff = periodCutoff(period)

  // Aggregate by referrerAddress
  const byReferrer = new Map<
    string,
    { totalInvites: number; successfulReferrals: number; bonusPoints: number; lastActiveAt: number }
  >()

  for (const record of referralMap.values()) {
    if (record.registeredAt < cutoff) continue

    const existing = byReferrer.get(record.referrerAddress) ?? {
      totalInvites: 0,
      successfulReferrals: 0,
      bonusPoints: 0,
      lastActiveAt: 0,
    }

    byReferrer.set(record.referrerAddress, {
      totalInvites: existing.totalInvites + 1,
      successfulReferrals: existing.successfulReferrals + (record.bonusAwarded ? 1 : 0),
      bonusPoints: existing.bonusPoints + record.bonusPoints,
      lastActiveAt: Math.max(existing.lastActiveAt, record.registeredAt),
    })
  }

  // Sort by successfulReferrals desc, then bonusPoints desc, then lastActiveAt asc
  const sorted = [...byReferrer.entries()].sort(([, a], [, b]) => {
    if (b.successfulReferrals !== a.successfulReferrals) return b.successfulReferrals - a.successfulReferrals
    if (b.bonusPoints !== a.bonusPoints) return b.bonusPoints - a.bonusPoints
    return a.lastActiveAt - b.lastActiveAt
  })

  // Assign standard competition ranks and attach payout status
  const result: ReferralLeaderboardEntry[] = []
  let lastScore = { s: -1, p: -1 }
  let lastRank = 0

  for (let i = 0; i < Math.min(sorted.length, limit); i++) {
    const [address, agg] = sorted[i]
    const score = { s: agg.successfulReferrals, p: agg.bonusPoints }
    if (score.s !== lastScore.s || score.p !== lastScore.p) {
      lastRank = i + 1
      lastScore = score
    }

    // Look up latest payout status for this referrer
    let rewardPayoutStatus: ReferralPayoutStatus | undefined
    let rewardAmount: number | undefined
    for (const payout of payoutMap.values()) {
      if (payout.referrerAddress === address) {
        rewardPayoutStatus = payout.status
        rewardAmount = payout.rewardAmount
        break
      }
    }

    result.push({
      rank: lastRank,
      referrerAddress: address,
      successfulReferrals: agg.successfulReferrals,
      totalInvites: agg.totalInvites,
      bonusPoints: agg.bonusPoints,
      lastActiveAt: agg.lastActiveAt,
      ...(rewardPayoutStatus !== undefined ? { rewardPayoutStatus, rewardAmount } : {}),
    })
  }

  return result
}

/** Computes aggregate stats from the full referral map. */
export function getReferralLeaderboardStats(): ReferralLeaderboardStats {
  let totalReferrers = 0
  let totalSuccessfulReferrals = 0
  let totalBonusDistributed = 0

  const seen = new Set<string>()
  for (const record of referralMap.values()) {
    if (!seen.has(record.referrerAddress)) {
      seen.add(record.referrerAddress)
      totalReferrers++
    }
    if (record.bonusAwarded) {
      totalSuccessfulReferrals++
      totalBonusDistributed += record.bonusPoints
    }
  }

  return {
    totalReferrers,
    totalSuccessfulReferrals,
    totalBonusDistributed,
    activeRewardPool: 0, // populated from configuration in the API layer
  }
}

/**
 * Returns the leaderboard entry for a single address, or null if not present.
 */
export function getReferrerRank(
  address: string,
  period: ReferralLeaderboardPeriod = "all"
): ReferralLeaderboardEntry | null {
  const board = getReferralLeaderboard({ period, limit: 1000 })
  const norm = normaliseAddress(address)
  return board.find((e) => e.referrerAddress === norm) ?? null
}

// ─── Payouts ─────────────────────────────────────────────────────────────────

export interface PayoutAllocation {
  rank: number
  referrerAddress: string
  amount: number
  rewardType: "xlm" | "points"
}

export interface ProcessPayoutsResult {
  dryRun: boolean
  payouts: ReferralPayoutRecord[]
  totalAmount: number
}

/**
 * Creates (and optionally executes) reward payout records for top referrers.
 *
 * When `execute` is false (default), a dry-run preview is returned without
 * writing any records to the store. When `execute` is true, records are
 * persisted with status "pending" (a background job / on-chain call would
 * then transition them to "processing" -> "paid").
 */
export function processReferralPayouts(
  period: "weekly" | "monthly" | "seasonal" | "manual",
  allocations: PayoutAllocation[],
  execute = false
): ProcessPayoutsResult {
  const now = Date.now()
  const records: ReferralPayoutRecord[] = []
  let totalAmount = 0

  for (const alloc of allocations) {
    const record: ReferralPayoutRecord = {
      id: generateId(),
      period,
      referrerAddress: normaliseAddress(alloc.referrerAddress),
      rank: alloc.rank,
      rewardAmount: alloc.amount,
      rewardType: alloc.rewardType,
      status: "pending" as ReferralPayoutStatus,
      createdAt: now,
    }

    if (execute) {
      payoutMap.set(record.id, record)
    }

    records.push(record)
    totalAmount += alloc.amount
  }

  return { dryRun: !execute, payouts: records, totalAmount }
}

/** Returns all payout records. */
export function getAllPayouts(): ReferralPayoutRecord[] {
  return [...payoutMap.values()]
}

/** Updates a payout's status (e.g. from "pending" to "paid"). */
export function updatePayoutStatus(
  payoutId: string,
  status: ReferralPayoutStatus,
  txHash?: string
): ReferralPayoutRecord | null {
  const record = payoutMap.get(payoutId)
  if (!record) return null

  const updated: ReferralPayoutRecord = {
    ...record,
    status,
    processedAt: Date.now(),
    ...(txHash ? { txHash } : {}),
  }
  payoutMap.set(payoutId, updated)
  return updated
}

// ─── Test helpers ─────────────────────────────────────────────────────────────
// Exported only for unit-test usage — not part of the public API surface.

/** Clears all in-memory state. Call in beforeEach in tests. */
export function _clearReferralStore(): void {
  referralMap.clear()
  payoutMap.clear()
  referrerIpMap.clear()
  referrerSessionMap.clear()
}

/** Directly injects a referral record (bypasses validation). Tests only. */
export function _injectReferralRecord(record: ReferralRecord): void {
  referralMap.set(record.referredAddress, record)
}
