import { matchesClueAnswer } from "@/lib/clueAnswerVerification"
import { getServerClue } from "@/lib/server/seedClues"
import { logger } from "@/lib/logger"
import * as fs from "fs"
import * as path from "path"

const DATA_DIR = path.join(process.cwd(), "lib", "anti-cheat-data")
const ANSWERS_FILE = path.join(DATA_DIR, "answers.json")
const ANOMALIES_FILE = path.join(DATA_DIR, "anomalies.json")
const BANS_FILE = path.join(DATA_DIR, "bans.json")
const TRACKING_FILE = path.join(DATA_DIR, "tracking.json")

export interface AntiCheatConfig {
  minClueIntervalMs: number
  maxSubmissionsPerWindow: number
  submissionWindowMs: number
  maxSubmissionsPerWalletPerWindow: number
  walletSubmissionWindowMs: number
  maxAnomaliesBeforeFlag: number
  speedBonusWindowSeconds: number
  speedBonusMaxPoints: number
}

export const DEFAULT_CONFIG: AntiCheatConfig = {
  minClueIntervalMs: 2000,
  maxSubmissionsPerWindow: 100,
  submissionWindowMs: 60_000,
  maxSubmissionsPerWalletPerWindow: 30,
  walletSubmissionWindowMs: 60_000,
  maxAnomaliesBeforeFlag: 3,
  speedBonusWindowSeconds: 60,
  speedBonusMaxPoints: 59,
}

interface StoredAnswer {
  huntId: number
  clueId: number
  wallet: string
  ip: string
  correct: boolean
  serverTimestamp: number
  clientTimestamp: number | null
  score: number
  bonusPoints: number
  anomalyFlags: string[]
}

interface AnomalyRecord {
  id: string
  wallet: string
  ip: string
  type: "fast_submission" | "rapid_attempts" | "impossible_pattern" | "excessive_frequency" | "suspicious_wallet_ip"
  details: string
  timestamp: number
  huntId: number
  clueId: number
}

interface BanRecord {
  wallet: string
  ip: string
  reason: string
  bannedAt: number
  bannedBy: string
}

interface ClueTracking {
  lastSubmissionTime: number
  attemptCount: number
}

interface TrackingData {
  [key: string]: ClueTracking
}

function readJSON<T>(filePath: string, fallback: T): T {
  try {
    const data = fs.readFileSync(filePath, "utf-8")
    return JSON.parse(data)
  } catch {
    return fallback
  }
}

function writeJSON<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8")
  } catch (err) {
    logger.error("Failed to write anti-cheat data file:", filePath, err)
  }
}

function getAnswers(): StoredAnswer[] {
  return readJSON<StoredAnswer[]>(ANSWERS_FILE, [])
}

function saveAnswers(answers: StoredAnswer[]): void {
  writeJSON(ANSWERS_FILE, answers)
}

function getAnomalies(): AnomalyRecord[] {
  return readJSON<AnomalyRecord[]>(ANOMALIES_FILE, [])
}

function saveAnomalies(anomalies: AnomalyRecord[]): void {
  writeJSON(ANOMALIES_FILE, anomalies)
}

function getBans(): BanRecord[] {
  return readJSON<BanRecord[]>(BANS_FILE, [])
}

function saveBans(bans: BanRecord[]): void {
  writeJSON(BANS_FILE, bans)
}

function getTracking(): TrackingData {
  return readJSON<TrackingData>(TRACKING_FILE, {})
}

function saveTracking(tracking: TrackingData): void {
  writeJSON(TRACKING_FILE, tracking)
}

let config: AntiCheatConfig = { ...DEFAULT_CONFIG }

export function setConfig(overrides: Partial<AntiCheatConfig>): void {
  config = { ...config, ...overrides }
}

export function getConfig(): AntiCheatConfig {
  return { ...config }
}

function trackingKey(wallet: string, huntId: number, clueId: number): string {
  return `${wallet}_${huntId}_${clueId}`
}

export function verifyAnswer(huntId: number, clueId: number, answer: string): Promise<boolean> {
  const clue = getServerClue(huntId, clueId)
  if (!clue) return Promise.resolve(false)
  return matchesClueAnswer(answer, clue, huntId)
}

export function checkMinInterval(wallet: string, huntId: number, clueId: number): { allowed: boolean; waitMs: number } {
  const tracking = getTracking()
  const key = trackingKey(wallet, huntId, clueId)
  const record = tracking[key]

  if (!record) {
    return { allowed: true, waitMs: 0 }
  }

  const elapsed = Date.now() - record.lastSubmissionTime
  if (elapsed < config.minClueIntervalMs) {
    return { allowed: false, waitMs: config.minClueIntervalMs - elapsed }
  }

  return { allowed: true, waitMs: 0 }
}

export function trackClueSubmission(wallet: string, huntId: number, clueId: number): void {
  const tracking = getTracking()
  const key = trackingKey(wallet, huntId, clueId)

  if (tracking[key]) {
    tracking[key].lastSubmissionTime = Date.now()
    tracking[key].attemptCount += 1
  } else {
    tracking[key] = { lastSubmissionTime: Date.now(), attemptCount: 1 }
  }

  saveTracking(tracking)
}

export function detectAnomalies(
  wallet: string,
  ip: string,
  huntId: number,
  clueId: number,
  correct: boolean,
): string[] {
  const flags: string[] = []
  const tracking = getTracking()
  const key = trackingKey(wallet, huntId, clueId)
  const record = tracking[key]

  if (record && record.attemptCount > 5) {
    flags.push("rapid_attempts")
  }

  if (record && record.lastSubmissionTime) {
    const elapsed = Date.now() - record.lastSubmissionTime
    if (elapsed < 1000) {
      flags.push("fast_submission")
    }
  }

  if (correct && record && record.attemptCount === 1 && record.lastSubmissionTime) {
    const elapsedSinceFirst = Date.now() - record.lastSubmissionTime
    if (elapsedSinceFirst < 500) {
      flags.push("impossible_pattern")
    }
  }

  const answers = getAnswers()
  const recentWallet = answers.filter(
    (a) => a.wallet === wallet && Date.now() - a.serverTimestamp < 10_000,
  )
  if (recentWallet.length > 10) {
    flags.push("excessive_frequency")
  }

  const sameIpDifferentWallets = answers.filter(
    (a) => a.ip === ip && a.wallet !== wallet && Date.now() - a.serverTimestamp < 300_000,
  )
  if (sameIpDifferentWallets.length > 3) {
    flags.push("suspicious_wallet_ip")
  }

  const sameWalletDifferentIps = answers.filter(
    (a) => a.wallet === wallet && a.ip !== ip && Date.now() - a.serverTimestamp < 3600_000,
  )
  if (sameWalletDifferentIps.length > 2) {
    flags.push("suspicious_wallet_ip")
  }

  return flags
}

export function recordAnswer(
  huntId: number,
  clueId: number,
  wallet: string,
  ip: string,
  answer: string,
  correct: boolean,
  clientTimestamp: number | null,
  score: number,
  bonusPoints: number,
  anomalyFlags: string[],
): void {
  const record: StoredAnswer = {
    huntId,
    clueId,
    wallet,
    ip,
    correct,
    serverTimestamp: Date.now(),
    clientTimestamp,
    score,
    bonusPoints,
    anomalyFlags,
  }

  const answers = getAnswers()
  answers.push(record)
  saveAnswers(answers)

  for (const flag of anomalyFlags) {
    const anomaly: AnomalyRecord = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      wallet,
      ip,
      type: flag as AnomalyRecord["type"],
      details: `huntId=${huntId} clueId=${clueId} correct=${correct} score=${score}`,
      timestamp: Date.now(),
      huntId,
      clueId,
    }

    const anomalies = getAnomalies()
    anomalies.push(anomaly)
    saveAnomalies(anomalies)
    logger.warn(`[Anti-Cheat] Anomaly detected: ${flag} - wallet=${wallet} ip=${ip}`)
  }
}

export function isBanned(wallet: string, ip: string): boolean {
  const bans = getBans()
  return bans.some((b) => b.wallet === wallet || b.ip === ip)
}

export function getFlaggedUsers(): { wallet: string; ip: string; anomalyCount: number; lastAnomaly: number }[] {
  const anomalies = getAnomalies()
  const grouped = new Map<string, { wallet: string; ip: string; anomalyCount: number; lastAnomaly: number }>()

  for (const a of anomalies) {
    const key = a.wallet || a.ip
    const existing = grouped.get(key)
    if (existing) {
      existing.anomalyCount++
      if (a.timestamp > existing.lastAnomaly) {
        existing.lastAnomaly = a.timestamp
      }
    } else {
      grouped.set(key, {
        wallet: a.wallet,
        ip: a.ip,
        anomalyCount: 1,
        lastAnomaly: a.timestamp,
      })
    }
  }

  return Array.from(grouped.values()).sort((a, b) => b.lastAnomaly - a.lastAnomaly)
}

export function getAnomalyHistory(wallet?: string): AnomalyRecord[] {
  const anomalies = getAnomalies()
  if (wallet) {
    return anomalies.filter((a) => a.wallet === wallet).sort((a, b) => b.timestamp - a.timestamp)
  }
  return anomalies.sort((a, b) => b.timestamp - a.timestamp)
}

export function getSubmissionHistory(wallet?: string): StoredAnswer[] {
  const answers = getAnswers()
  if (wallet) {
    return answers.filter((a) => a.wallet === wallet).sort((a, b) => b.serverTimestamp - a.serverTimestamp)
  }
  return answers.sort((a, b) => b.serverTimestamp - a.serverTimestamp)
}

export function getBannedUsers(): BanRecord[] {
  return getBans()
}

export function banUser(wallet: string, ip: string, reason: string, bannedBy: string): void {
  const bans = getBans()
  if (!bans.some((b) => b.wallet === wallet || b.ip === ip)) {
    bans.push({ wallet, ip, reason, bannedAt: Date.now(), bannedBy })
    saveBans(bans)
    logger.warn(`[Anti-Cheat] User banned: wallet=${wallet} ip=${ip} reason="${reason}" by=${bannedBy}`)
  }
}

export function unbanUser(wallet: string): boolean {
  const bans = getBans()
  const filtered = bans.filter((b) => b.wallet !== wallet)
  if (filtered.length === bans.length) return false
  saveBans(filtered)
  logger.info(`[Anti-Cheat] User unbanned: wallet=${wallet}`)
  return true
}

export function calculateScore(huntId: number, clueId: number, correct: boolean): { score: number; bonusPoints: number } {
  if (!correct) return { score: 0, bonusPoints: 0 }

  const clue = getServerClue(huntId, clueId)
  if (!clue) return { score: 0, bonusPoints: 0 }

  const baseScore = clue.points
  return { score: baseScore, bonusPoints: 0 }
}
