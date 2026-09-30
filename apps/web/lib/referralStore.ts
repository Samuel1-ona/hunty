/**
 * Server-side referral store for the referral leaderboard and rewards system.
 *
 * Responsibilities:
 *  - Record incoming referrals with strict anti-self-referral validation
 *    (wallet address match, IP address match, session ID match).
 *  - Build a ranked referral leaderboard from stored records.
 *  - Process reward payout allocations for top referrers.
 *
 * Storage: PostgreSQL via the shared `getDb()` client (see lib/db). This
 * replaces the previous in-memory Map implementation, which was process-scoped
 * and lost on every deploy / serverless cold start.
 *
 * Tables (migration 012_create_referrals.sql):
 *  - referrals          → one row per referred wallet
 *  - referrer_devices   → IP / session per referrer (anti-self-referral)
 *  - referral_payouts   → one payout record per (period, referrer) — the
 *                         UNIQUE constraint makes payout creation idempotent.
 */

import { getDb } from "@/lib/db"
import type {
  ReferralLeaderboardEntry,
  ReferralLeaderboardPeriod,
  ReferralLeaderboardStats,
  ReferralPayoutRecord,
  ReferralPayoutStatus,
  ReferralRecord,
} from "@/lib/types"

// ─── DB row types ─────────────────────────────────────────────────────────────

interface ReferralRow {
  code: string
  referrer_address: string
  referred_address: string
  registered_at: Date
  first_completed_at: Date | null
  first_completed_hunt_id: number | null
  bonus_awarded: boolean
  bonus_points: number
}

interface ReferralPayoutRow {
  id: string
  period: "weekly" | "monthly" | "seasonal" | "manual"
  referrer_address: string
  rank: number
  reward_amount: number
  reward_type: "xlm" | "points"
  status: ReferralPayoutStatus
  created_at: Date
  processed_at: Date | null
  tx_hash: string | null
}

const REFERRAL_COLUMNS = `
  code, referrer_address, referred_address, registered_at,
  first_completed_at, first_completed_hunt_id, bonus_awarded, bonus_points
` as const

const PAYOUT_COLUMNS = `
  id, period, referrer_address, rank, reward_amount, reward_type,
  status, created_at, processed_at, tx_hash
` as const

function mapReferralRow(row: ReferralRow): ReferralRecord {
  return {
    code: row.code,
    referrerAddress: row.referrer_address,
    referredAddress: row.referred_address,
    registeredAt: new Date(row.registered_at).getTime(),
    ...(row.first_completed_at !== null
      ? { firstCompletedAt: new Date(row.first_completed_at).getTime() }
      : {}),
    ...(row.first_completed_hunt_id !== null && row.first_completed_hunt_id !== undefined
      ? { firstCompletedHuntId: row.first_completed_hunt_id }
      : {}),
    bonusAwarded: Boolean(row.bonus_awarded),
    bonusPoints: row.bonus_points,
  }
}

function mapPayoutRow(row: ReferralPayoutRow): ReferralPayoutRecord {
  return {
    id: row.id,
    period: row.period,
    referrerAddress: row.referrer_address,
    rank: row.rank,
    rewardAmount: Number(row.reward_amount),
    rewardType: row.reward_type,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
    ...(row.processed_at !== null ? { processedAt: new Date(row.processed_at).getTime() } : {}),
    ...(row.tx_hash !== null ? { txHash: row.tx_hash } : {}),
  }
}

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
export async function validateReferralEligibility(
  referrerAddress: string,
  referredAddress: string,
  clientIp?: string | null,
  sessionId?: string | null
): Promise<ReferralValidationResult> {
  const normReferrer = normaliseAddress(referrerAddress)
  const normReferred = normaliseAddress(referredAddress)

  // Rule 1: wallet match
  if (normReferrer === normReferred) {
    return { valid: false, reason: "self_referral_wallet" }
  }

  const sql = getDb()
  const devices = await sql<Array<{ client_ip: string | null; session_id: string | null }>>`
    SELECT client_ip, session_id
    FROM   referrer_devices
    WHERE  referrer_address = ${normReferrer}
    LIMIT  1
  `
  const device = devices[0]

  // Rule 2: IP match
  if (clientIp && device?.client_ip && device.client_ip === clientIp) {
    return { valid: false, reason: "self_referral_ip" }
  }

  // Rule 3: session ID match
  if (sessionId && device?.session_id && device.session_id === sessionId) {
    return { valid: false, reason: "self_referral_session" }
  }

  // Rule 4: already referred
  const existing = await sql<Array<{ referred_address: string }>>`
    SELECT referred_address
    FROM   referrals
    WHERE  referred_address = ${normReferred}
    LIMIT  1
  `
  if (existing.length > 0) {
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
export async function recordReferral(
  opts: RecordReferralOptions
): Promise<{ success: true; record: ReferralRecord } | { success: false; reason: string }> {
  const referrerAddress = normaliseAddress(opts.referrerAddress)
  const referredAddress = normaliseAddress(opts.referredAddress)

  const validation = await validateReferralEligibility(
    referrerAddress,
    referredAddress,
    opts.clientIp,
    opts.sessionId
  )

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  const record: ReferralRecord = {
    code: opts.code,
    referrerAddress,
    referredAddress,
    registeredAt: Date.now(),
    bonusAwarded: false,
    bonusPoints: 0,
    ...(opts.huntId !== undefined ? { firstCompletedHuntId: opts.huntId } : {}),
  }

  const sql = getDb()

  // Store the referrer's IP and session so future referred wallets from the same
  // device/session can be blocked. Each column is upserted independently so the
  // other source (IP vs session) is preserved when only one is present.
  if (opts.clientIp) {
    await sql`
      INSERT INTO referrer_devices (referrer_address, client_ip)
      VALUES (${referrerAddress}, ${opts.clientIp})
      ON CONFLICT (referrer_address) DO UPDATE
        SET client_ip = EXCLUDED.client_ip
    `
  }
  if (opts.sessionId) {
    await sql`
      INSERT INTO referrer_devices (referrer_address, session_id)
      VALUES (${referrerAddress}, ${opts.sessionId})
      ON CONFLICT (referrer_address) DO UPDATE
        SET session_id = EXCLUDED.session_id
    `
  }

  await sql`
    INSERT INTO referrals (code, referrer_address, referred_address, registered_at,
                           bonus_awarded, bonus_points, first_completed_hunt_id)
    VALUES (${record.code}, ${record.referrerAddress}, ${record.referredAddress},
            NOW(), ${record.bonusAwarded}, ${record.bonusPoints},
            ${record.firstCompletedHuntId ?? null})
  `

  return { success: true, record }
}

/**
 * Marks the referred player's first hunt completion and awards bonus points
 * to the referrer record. Idempotent — does nothing if already awarded.
 */
export async function awardServerReferralBonus(
  referredAddress: string,
  huntId: number,
  bonusPoints = 25
): Promise<ReferralRecord | null> {
  const normReferred = normaliseAddress(referredAddress)
  const sql = getDb()

  // Atomic conditional update: only an unawarded record is upgraded, so a
  // concurrent duplicate award cannot double the points.
  const updated = await sql<ReferralRow[]>`
    UPDATE referrals
    SET    bonus_awarded = true,
           bonus_points = ${bonusPoints},
           first_completed_at = NOW(),
           first_completed_hunt_id = ${huntId}
    WHERE  referred_address = ${normReferred} AND bonus_awarded = false
    RETURNING ${REFERRAL_COLUMNS}
  `

  if (updated.length > 0) {
    return mapReferralRow(updated[0])
  }

  // No row was upgraded — either the record is absent or the bonus was already
  // awarded. Return the existing record so callers observe the idempotent state.
  const existing = await sql<ReferralRow[]>`
    SELECT ${REFERRAL_COLUMNS}
    FROM   referrals
    WHERE  referred_address = ${normReferred}
    LIMIT  1
  `
  return existing.length > 0 ? mapReferralRow(existing[0]) : null
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
export async function getReferralLeaderboard(
  options: {
    period?: ReferralLeaderboardPeriod
    limit?: number
  } = {}
): Promise<ReferralLeaderboardEntry[]> {
  const { period = "all", limit = 50 } = options
  const cutoff = periodCutoff(period)

  const sql = getDb()

  const [referrals, payouts] = await Promise.all([
    sql<ReferralRow[]>`SELECT ${REFERRAL_COLUMNS} FROM referrals`,
    sql<ReferralPayoutRow[]>`SELECT ${PAYOUT_COLUMNS} FROM referral_payouts`,
  ])

  const records = referrals.map(mapReferralRow)

  // Aggregate by referrerAddress
  const byReferrer = new Map<
    string,
    { totalInvites: number; successfulReferrals: number; bonusPoints: number; lastActiveAt: number }
  >()

  for (const record of records) {
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

  // First payout per referrer wins (earliest created_at).
  const payoutByReferrer = new Map<string, ReferralPayoutRecord>()
  for (const payoutRow of payouts) {
    const payout = mapPayoutRow(payoutRow)
    if (!payoutByReferrer.has(payout.referrerAddress)) {
      payoutByReferrer.set(payout.referrerAddress, payout)
    }
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
    const payout = payoutByReferrer.get(address)

    result.push({
      rank: lastRank,
      referrerAddress: address,
      successfulReferrals: agg.successfulReferrals,
      totalInvites: agg.totalInvites,
      bonusPoints: agg.bonusPoints,
      lastActiveAt: agg.lastActiveAt,
      ...(payout ? { rewardPayoutStatus: payout.status, rewardAmount: payout.rewardAmount } : {}),
    })
  }

  return result
}

/** Computes aggregate stats from all referral records. */
export async function getReferralLeaderboardStats(): Promise<ReferralLeaderboardStats> {
  const sql = getDb()
  const rows = await sql<ReferralRow[]>`SELECT ${REFERRAL_COLUMNS} FROM referrals`
  const records = rows.map(mapReferralRow)

  let totalReferrers = 0
  let totalSuccessfulReferrals = 0
  let totalBonusDistributed = 0

  const seen = new Set<string>()
  for (const record of records) {
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
export async function getReferrerRank(
  address: string,
  period: ReferralLeaderboardPeriod = "all"
): Promise<ReferralLeaderboardEntry | null> {
  const board = await getReferralLeaderboard({ period, limit: 1000 })
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
 *
 * Payout creation is idempotent per (period, referrer): re-running the same
 * allocations reuses the existing payout record instead of creating a
 * duplicate. A UNIQUE (period, referrer_address) constraint in the DB backs
 * this up.
 */
export async function processReferralPayouts(
  period: "weekly" | "monthly" | "seasonal" | "manual",
  allocations: PayoutAllocation[],
  execute = false
): Promise<ProcessPayoutsResult> {
  const now = Date.now()
  const records: ReferralPayoutRecord[] = []
  let totalAmount = 0

  const sql = getDb()

  for (const alloc of allocations) {
    const referrerAddress = normaliseAddress(alloc.referrerAddress)

    let record: ReferralPayoutRecord

    if (execute) {
      const existing = await sql<ReferralPayoutRow[]>`
        SELECT ${PAYOUT_COLUMNS}
        FROM   referral_payouts
        WHERE  period = ${period} AND referrer_address = ${referrerAddress}
        LIMIT  1
      `

      if (existing.length > 0) {
        record = mapPayoutRow(existing[0])
      } else {
        record = {
          id: generateId(),
          period,
          referrerAddress,
          rank: alloc.rank,
          rewardAmount: alloc.amount,
          rewardType: alloc.rewardType,
          status: "pending" as ReferralPayoutStatus,
          createdAt: now,
        }

        await sql`
          INSERT INTO referral_payouts (id, period, referrer_address, rank,
                                        reward_amount, reward_type, status, created_at)
          VALUES (${record.id}, ${record.period}, ${record.referrerAddress}, ${record.rank},
                  ${record.rewardAmount}, ${record.rewardType}, ${record.status}, NOW())
        `
      }
    } else {
      record = {
        id: generateId(),
        period,
        referrerAddress,
        rank: alloc.rank,
        rewardAmount: alloc.amount,
        rewardType: alloc.rewardType,
        status: "pending" as ReferralPayoutStatus,
        createdAt: now,
      }
    }

    records.push(record)
    totalAmount += alloc.amount
  }

  return { dryRun: !execute, payouts: records, totalAmount }
}

/** Returns all payout records. */
export async function getAllPayouts(): Promise<ReferralPayoutRecord[]> {
  const sql = getDb()
  const rows = await sql<ReferralPayoutRow[]>`
    SELECT ${PAYOUT_COLUMNS}
    FROM   referral_payouts
    ORDER  BY created_at ASC
  `
  return rows.map(mapPayoutRow)
}

/** Updates a payout's status (e.g. from "pending" to "paid"). */
export async function updatePayoutStatus(
  payoutId: string,
  status: ReferralPayoutStatus,
  txHash?: string
): Promise<ReferralPayoutRecord | null> {
  const sql = getDb()

  const updated = txHash
    ? await sql<ReferralPayoutRow[]>`
        UPDATE referral_payouts
        SET    status = ${status},
               processed_at = NOW(),
               tx_hash = ${txHash}
        WHERE  id = ${payoutId}
        RETURNING ${PAYOUT_COLUMNS}
      `
    : await sql<ReferralPayoutRow[]>`
        UPDATE referral_payouts
        SET    status = ${status},
               processed_at = NOW()
        WHERE  id = ${payoutId}
        RETURNING ${PAYOUT_COLUMNS}
      `

  return updated.length > 0 ? mapPayoutRow(updated[0]) : null
}

// ─── Test helpers ─────────────────────────────────────────────────────────────
// Exported only for unit-test usage — not part of the public API surface.

/** Clears all persisted state. Call in beforeEach in tests. */
export async function _clearReferralStore(): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM referrals`
  await sql`DELETE FROM referrer_devices`
  await sql`DELETE FROM referral_payouts`
}

/** Directly injects a referral record (bypasses validation). Tests only. */
export async function _injectReferralRecord(record: ReferralRecord): Promise<void> {
  const sql = getDb()
  await sql`
    INSERT INTO referrals (code, referrer_address, referred_address, registered_at,
                           first_completed_at, first_completed_hunt_id,
                           bonus_awarded, bonus_points)
    VALUES (${record.code}, ${record.referrerAddress}, ${record.referredAddress},
            ${new Date(record.registeredAt).toISOString()},
            ${record.firstCompletedAt !== undefined ? new Date(record.firstCompletedAt).toISOString() : null},
            ${record.firstCompletedHuntId ?? null},
            ${record.bonusAwarded}, ${record.bonusPoints})
  `
}
