/**
 * PostgreSQL-backed anti-cheat store.
 *
 * All reads and writes go through the shared PostgreSQL database, which means:
 *  - Bans, anomalies, and config are consistent across every serverless instance.
 *  - Data survives deploys and instance recycling.
 *  - Failures propagate as thrown errors instead of being silently swallowed.
 *
 * This replaces the previous file-based JSON store (lib/anti-cheat-data/*.json)
 * which was per-instance on serverless platforms and lost on every deploy.
 * The anti-cheat config (previously a module-level `let`) is now persisted in
 * the app_settings table so that setConfig() changes survive restarts.
 *
 * Functions in this module are async. Callers (API route handlers) must await
 * them.
 */

import { getDb } from "@/lib/db"
import { logger } from "@/lib/logger"
import { matchesClueAnswer } from "@/lib/clueAnswerVerification"
import { getServerClue } from "@/lib/server/seedClues"

// ---------------------------------------------------------------------------
// Config — stored in the shared app_settings table (key = 'anti_cheat_config').
// ---------------------------------------------------------------------------

const CONFIG_KEY = "anti_cheat_config"

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

export async function getConfig(): Promise<AntiCheatConfig> {
  const sql = getDb()
  const rows = await sql<{ value: string | null }[]>`
    SELECT value FROM app_settings
    WHERE  key = ${CONFIG_KEY}
    LIMIT  1
  `
  if (rows.length === 0 || rows[0].value === null) {
    return { ...DEFAULT_CONFIG }
  }
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(rows[0].value) }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export async function setConfig(
  overrides: Partial<AntiCheatConfig>,
): Promise<void> {
  const current = await getConfig()
  const merged = { ...current, ...overrides }
  const sql = getDb()
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${CONFIG_KEY}, ${JSON.stringify(merged)}, NOW())
    ON CONFLICT (key) DO UPDATE
      SET value      = EXCLUDED.value,
          updated_at = EXCLUDED.updated_at
  `
}

// ---------------------------------------------------------------------------
// Row types.
// ---------------------------------------------------------------------------

interface AnswerRow {
  id: number
  hunt_id: number
  clue_id: number
  wallet: string
  ip: string
  correct: boolean
  server_timestamp: number
  client_timestamp: number | null
  score: number
  bonus_points: number
  anomaly_flags: string[]
}

interface AnomalyRow {
  id: string
  wallet: string
  ip: string
  type: string
  details: string
  timestamp: number
  hunt_id: number
  clue_id: number
}

interface BanRow {
  wallet: string
  ip: string
  reason: string
  banned_at: number
  banned_by: string
}

interface TrackingRow {
  tracking_key: string
  last_submission_time: number
  attempt_count: number
}

// ---------------------------------------------------------------------------
// Conversion helpers — row ↔ domain type.
// ---------------------------------------------------------------------------

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

function answerRowToStored(row: AnswerRow): StoredAnswer {
  return {
    huntId: row.hunt_id,
    clueId: row.clue_id,
    wallet: row.wallet,
    ip: row.ip,
    correct: row.correct,
    serverTimestamp: row.server_timestamp,
    clientTimestamp: row.client_timestamp,
    score: row.score,
    bonusPoints: row.bonus_points,
    anomalyFlags: row.anomaly_flags ?? [],
  }
}

function anomalyRowToRecord(row: AnomalyRow): AnomalyRecord {
  return {
    id: row.id,
    wallet: row.wallet,
    ip: row.ip,
    type: row.type as AnomalyRecord["type"],
    details: row.details,
    timestamp: row.timestamp,
    huntId: row.hunt_id,
    clueId: row.clue_id,
  }
}

function banRowToRecord(row: BanRow): BanRecord {
  return {
    wallet: row.wallet,
    ip: row.ip,
    reason: row.reason,
    bannedAt: row.banned_at,
    bannedBy: row.banned_by,
  }
}

// ---------------------------------------------------------------------------
// Tracking helpers.
// ---------------------------------------------------------------------------

function trackingKey(wallet: string, huntId: number, clueId: number): string {
  return `${wallet}_${huntId}_${clueId}`
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

export async function verifyAnswer(
  huntId: number,
  clueId: number,
  answer: string,
): Promise<boolean> {
  const clue = getServerClue(huntId, clueId)
  if (!clue) return false
  return matchesClueAnswer(answer, clue, huntId)
}

export async function checkMinInterval(
  wallet: string,
  huntId: number,
  clueId: number,
): Promise<{ allowed: boolean; waitMs: number }> {
  const config = await getConfig()
  const sql = getDb()
  const key = trackingKey(wallet, huntId, clueId)

  const rows = await sql<TrackingRow[]>`
    SELECT * FROM anti_cheat_tracking
    WHERE  tracking_key = ${key}
    LIMIT  1
  `
  if (rows.length === 0) {
    return { allowed: true, waitMs: 0 }
  }

  const elapsed = Date.now() - rows[0].last_submission_time
  if (elapsed < config.minClueIntervalMs) {
    return { allowed: false, waitMs: config.minClueIntervalMs - elapsed }
  }

  return { allowed: true, waitMs: 0 }
}

export async function trackClueSubmission(
  wallet: string,
  huntId: number,
  clueId: number,
): Promise<void> {
  const sql = getDb()
  const key = trackingKey(wallet, huntId, clueId)
  const now = Date.now()

  await sql`
    INSERT INTO anti_cheat_tracking (tracking_key, last_submission_time, attempt_count)
    VALUES (${key}, ${now}, 1)
    ON CONFLICT (tracking_key) DO UPDATE
      SET last_submission_time = ${now},
          attempt_count        = anti_cheat_tracking.attempt_count + 1
  `
}

export async function detectAnomalies(
  wallet: string,
  ip: string,
  huntId: number,
  clueId: number,
  correct: boolean,
): Promise<string[]> {
  const sql = getDb()
  const flags: string[] = []

  // Check tracking-based anomalies.
  const key = trackingKey(wallet, huntId, clueId)
  const trackingRows = await sql<TrackingRow[]>`
    SELECT * FROM anti_cheat_tracking
    WHERE  tracking_key = ${key}
    LIMIT  1
  `
  const record = trackingRows[0]

  if (record && record.attempt_count > 5) {
    flags.push("rapid_attempts")
  }

  if (record && record.last_submission_time) {
    const elapsed = Date.now() - record.last_submission_time
    if (elapsed < 1000) {
      flags.push("fast_submission")
    }
  }

  if (correct && record && record.attempt_count === 1 && record.last_submission_time) {
    const elapsedSinceFirst = Date.now() - record.last_submission_time
    if (elapsedSinceFirst < 500) {
      flags.push("impossible_pattern")
    }
  }

  // Check answer-history-based anomalies.
  const now = Date.now()
  const recentWallet = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM anti_cheat_answers
    WHERE  wallet = ${wallet}
      AND  server_timestamp > ${now - 10_000}
  `
  if (recentWallet[0] && recentWallet[0].count > 10) {
    flags.push("excessive_frequency")
  }

  const sameIpDifferentWallets = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM anti_cheat_answers
    WHERE  ip = ${ip}
      AND  wallet != ${wallet}
      AND  server_timestamp > ${now - 300_000}
  `
  if (sameIpDifferentWallets[0] && sameIpDifferentWallets[0].count > 3) {
    flags.push("suspicious_wallet_ip")
  }

  const sameWalletDifferentIps = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM anti_cheat_answers
    WHERE  wallet = ${wallet}
      AND  ip != ${ip}
      AND  server_timestamp > ${now - 3_600_000}
  `
  if (sameWalletDifferentIps[0] && sameWalletDifferentIps[0].count > 2) {
    flags.push("suspicious_wallet_ip")
  }

  return flags
}

export async function recordAnswer(
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
): Promise<void> {
  const sql = getDb()
  const serverTimestamp = Date.now()

  await sql`
    INSERT INTO anti_cheat_answers
      (hunt_id, clue_id, wallet, ip, correct, server_timestamp,
       client_timestamp, score, bonus_points, anomaly_flags)
    VALUES
      (${huntId}, ${clueId}, ${wallet}, ${ip}, ${correct}, ${serverTimestamp},
       ${clientTimestamp}, ${score}, ${bonusPoints}, ${anomalyFlags})
  `

  for (const flag of anomalyFlags) {
    const anomalyId = `${serverTimestamp}_${Math.random().toString(36).slice(2, 8)}`
    await sql`
      INSERT INTO anti_cheat_anomalies
        (id, wallet, ip, type, details, timestamp, hunt_id, clue_id)
      VALUES
        (${anomalyId}, ${wallet}, ${ip}, ${flag},
         ${`huntId=${huntId} clueId=${clueId} correct=${correct} score=${score}`},
         ${serverTimestamp}, ${huntId}, ${clueId})
    `
    logger.warn(`[Anti-Cheat] Anomaly detected: ${flag} - wallet=${wallet} ip=${ip}`)
  }
}

export async function isBanned(wallet: string, ip: string): Promise<boolean> {
  const sql = getDb()
  const rows = await sql<{ wallet: string }[]>`
    SELECT wallet FROM anti_cheat_bans
    WHERE  wallet = ${wallet} OR ip = ${ip}
    LIMIT  1
  `
  return rows.length > 0
}

export async function getFlaggedUsers(): Promise<
  { wallet: string; ip: string; anomalyCount: number; lastAnomaly: number }[]
> {
  const sql = getDb()
  const rows = await sql<{
    wallet: string
    ip: string
    anomaly_count: number
    last_anomaly: number
  }[]>`
    SELECT wallet,
           ip,
           COUNT(*)::int    AS anomaly_count,
           MAX(timestamp)   AS last_anomaly
    FROM   anti_cheat_anomalies
    GROUP  BY wallet, ip
    ORDER  BY last_anomaly DESC
  `

  return rows.map((r) => ({
    wallet: r.wallet,
    ip: r.ip,
    anomalyCount: r.anomaly_count,
    lastAnomaly: r.last_anomaly,
  }))
}

export async function getAnomalyHistory(
  wallet?: string,
): Promise<AnomalyRecord[]> {
  const sql = getDb()

  if (wallet) {
    const rows = await sql<AnomalyRow[]>`
      SELECT * FROM anti_cheat_anomalies
      WHERE  wallet = ${wallet}
      ORDER  BY timestamp DESC
    `
    return rows.map(anomalyRowToRecord)
  }

  const rows = await sql<AnomalyRow[]>`
    SELECT * FROM anti_cheat_anomalies
    ORDER  BY timestamp DESC
  `
  return rows.map(anomalyRowToRecord)
}

export async function getSubmissionHistory(
  wallet?: string,
): Promise<StoredAnswer[]> {
  const sql = getDb()

  if (wallet) {
    const rows = await sql<AnswerRow[]>`
      SELECT * FROM anti_cheat_answers
      WHERE  wallet = ${wallet}
      ORDER  BY server_timestamp DESC
    `
    return rows.map(answerRowToStored)
  }

  const rows = await sql<AnswerRow[]>`
    SELECT * FROM anti_cheat_answers
    ORDER  BY server_timestamp DESC
  `
  return rows.map(answerRowToStored)
}

export async function getBannedUsers(): Promise<BanRecord[]> {
  const sql = getDb()
  const rows = await sql<BanRow[]>`
    SELECT * FROM anti_cheat_bans
    ORDER  BY banned_at DESC
  `
  return rows.map(banRowToRecord)
}

export async function banUser(
  wallet: string,
  ip: string,
  reason: string,
  bannedBy: string,
): Promise<void> {
  const sql = getDb()
  const existing = await sql<{ wallet: string }[]>`
    SELECT wallet FROM anti_cheat_bans
    WHERE  wallet = ${wallet} OR ip = ${ip}
    LIMIT  1
  `
  if (existing.length > 0) return

  const bannedAt = Date.now()
  await sql`
    INSERT INTO anti_cheat_bans (wallet, ip, reason, banned_at, banned_by)
    VALUES (${wallet}, ${ip}, ${reason}, ${bannedAt}, ${bannedBy})
  `
  logger.warn(`[Anti-Cheat] User banned: wallet=${wallet} ip=${ip} reason="${reason}" by=${bannedBy}`)
}

export async function unbanUser(wallet: string): Promise<boolean> {
  const sql = getDb()
  const result = await sql<{ wallet: string }[]>`
    DELETE FROM anti_cheat_bans
    WHERE  wallet = ${wallet}
    RETURNING wallet
  `
  if (result.length > 0) {
    logger.info(`[Anti-Cheat] User unbanned: wallet=${wallet}`)
    return true
  }
  return false
}

export async function calculateScore(
  huntId: number,
  clueId: number,
  correct: boolean,
): Promise<{ score: number; bonusPoints: number }> {
  if (!correct) return { score: 0, bonusPoints: 0 }

  const clue = getServerClue(huntId, clueId)
  if (!clue) return { score: 0, bonusPoints: 0 }

  const baseScore = clue.points
  return { score: baseScore, bonusPoints: 0 }
}
