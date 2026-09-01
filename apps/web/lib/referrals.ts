import type { ReferralRecord, ReferralStats } from "@/lib/types"

const REFERRAL_RECORDS_KEY = "hunty:referrals"
const PENDING_REFERRAL_KEY = "hunty:pending-referral"
const DEFAULT_BONUS_POINTS = 25

function readReferralRecords(): ReferralRecord[] {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(REFERRAL_RECORDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ReferralRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeReferralRecords(records: ReferralRecord[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(REFERRAL_RECORDS_KEY, JSON.stringify(records))
}

function normalizeAddress(address: string): string {
  return address.trim()
}

export function buildReferralCode(address: string): string {
  return `wallet:${normalizeAddress(address)}`
}

export function getReferralLink(
  address: string,
  options?: {
    baseUrl?: string
    huntId?: number | string
  }
): string {
  const code = buildReferralCode(address)
  const huntId = options?.huntId ?? 1
  const origin =
    options?.baseUrl ??
    (typeof window !== "undefined" ? window.location.origin : "https://hunty.app")

  return `${origin}/hunt/${huntId}?ref=${encodeURIComponent(code)}`
}

export function parseReferralCode(code?: string | null): string | null {
  if (!code) return null
  const normalized = code.trim()
  if (!normalized.startsWith("wallet:G")) return null

  const address = normalized.slice("wallet:".length)
  return address.length > 0 ? address : null
}

export function storePendingReferralCode(code?: string | null): void {
  if (typeof window === "undefined") return
  if (!code) return

  const referrerAddress = parseReferralCode(code)
  if (!referrerAddress) return

  localStorage.setItem(PENDING_REFERRAL_KEY, code)
}

export function getPendingReferralCode(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(PENDING_REFERRAL_KEY)
}

export function clearPendingReferralCode(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(PENDING_REFERRAL_KEY)
}

export function consumePendingReferral(
  referredAddress: string
): ReferralRecord | null {
  if (typeof window === "undefined") return null

  const pendingCode = getPendingReferralCode()
  if (!pendingCode) return null

  const referrerAddress = parseReferralCode(pendingCode)
  const normalizedReferred = normalizeAddress(referredAddress)

  if (!referrerAddress || referrerAddress === normalizedReferred) {
    clearPendingReferralCode()
    return null
  }

  const existing = readReferralRecords().find(
    (record) => record.referredAddress === normalizedReferred
  )
  if (existing) {
    clearPendingReferralCode()
    return existing
  }

  const nextRecord: ReferralRecord = {
    code: pendingCode,
    referrerAddress,
    referredAddress: normalizedReferred,
    registeredAt: Date.now(),
    bonusAwarded: false,
    bonusPoints: 0,
  }

  writeReferralRecords([...readReferralRecords(), nextRecord])
  clearPendingReferralCode()
  return nextRecord
}

export function awardReferralBonusOnFirstCompletion(
  referredAddress: string,
  huntId: number,
  bonusPoints = DEFAULT_BONUS_POINTS
): ReferralRecord | null {
  const normalizedReferred = normalizeAddress(referredAddress)
  const records = readReferralRecords()
  const index = records.findIndex(
    (record) => record.referredAddress === normalizedReferred
  )

  if (index === -1) return null

  const record = records[index]
  if (record.bonusAwarded) return record

  const updated: ReferralRecord = {
    ...record,
    bonusAwarded: true,
    bonusPoints,
    firstCompletedAt: Date.now(),
    firstCompletedHuntId: huntId,
  }

  records[index] = updated
  writeReferralRecords(records)
  return updated
}

export function getReferralStats(address: string, baseUrl?: string): ReferralStats {
  const normalizedAddress = normalizeAddress(address)
  const records = readReferralRecords().filter(
    (record) => record.referrerAddress === normalizedAddress
  )

  return {
    code: buildReferralCode(normalizedAddress),
    totalInvites: records.length,
    successfulReferrals: records.filter((record) => record.bonusAwarded).length,
    pendingReferrals: records.filter((record) => !record.bonusAwarded).length,
    bonusPoints: records.reduce((sum, record) => sum + record.bonusPoints, 0),
    referralLink: getReferralLink(normalizedAddress, { baseUrl }),
    referrals: records.sort((left, right) => right.registeredAt - left.registeredAt),
  }
}
