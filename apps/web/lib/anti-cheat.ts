import { matchesClueAnswer } from "@/lib/clueAnswerVerification";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getServerClue } from "@/lib/server/seedClues";

export interface AntiCheatConfig {
  minClueIntervalMs: number;
  maxSubmissionsPerWindow: number;
  submissionWindowMs: number;
  maxSubmissionsPerWalletPerWindow: number;
  walletSubmissionWindowMs: number;
  maxAnomaliesBeforeFlag: number;
  speedBonusWindowSeconds: number;
  speedBonusMaxPoints: number;
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
};

let config: AntiCheatConfig = { ...DEFAULT_CONFIG };

export function setConfig(overrides: Partial<AntiCheatConfig>): void {
  config = { ...config, ...overrides };
}

export function getConfig(): AntiCheatConfig {
  return { ...config };
}

function trackingKey(wallet: string, huntId: number, clueId: number): string {
  return `${wallet}_${huntId}_${clueId}`;
}

export function verifyAnswer(huntId: number, clueId: number, answer: string): Promise<boolean> {
  const clue = getServerClue(huntId, clueId);
  if (!clue) return Promise.resolve(false);
  return matchesClueAnswer(answer, clue, huntId);
}

export async function checkMinInterval(
  wallet: string,
  huntId: number,
  clueId: number
): Promise<{ allowed: boolean; waitMs: number }> {
  const key = trackingKey(wallet, huntId, clueId);

  try {
    const sql = getDb();
    const rows = await sql<{ last_submission_time: Date }[]>`
      SELECT last_submission_time
      FROM anti_cheat_tracking
      WHERE key = ${key}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return { allowed: true, waitMs: 0 };
    }

    const elapsed = Date.now() - rows[0].last_submission_time.getTime();
    if (elapsed < config.minClueIntervalMs) {
      return { allowed: false, waitMs: config.minClueIntervalMs - elapsed };
    }

    return { allowed: true, waitMs: 0 };
  } catch (err) {
    logger.error("[Anti-Cheat] checkMinInterval DB error, allowing:", err);
    return { allowed: true, waitMs: 0 };
  }
}

export async function trackClueSubmission(
  wallet: string,
  huntId: number,
  clueId: number
): Promise<void> {
  const key = trackingKey(wallet, huntId, clueId);

  try {
    const sql = getDb();
    await sql`
      INSERT INTO anti_cheat_tracking (key, last_submission_time, attempt_count)
      VALUES (${key}, NOW(), 1)
      ON CONFLICT (key) DO UPDATE
        SET last_submission_time = NOW(),
            attempt_count = anti_cheat_tracking.attempt_count + 1
    `;
  } catch (err) {
    logger.error("[Anti-Cheat] trackClueSubmission DB error:", err);
  }
}

export async function detectAnomalies(
  wallet: string,
  ip: string,
  huntId: number,
  clueId: number,
  correct: boolean
): Promise<string[]> {
  const flags: string[] = [];
  const key = trackingKey(wallet, huntId, clueId);

  try {
    const sql = getDb();

    // Check tracking record for this key
    const trackRows = await sql<{ last_submission_time: Date; attempt_count: number }[]>`
      SELECT last_submission_time, attempt_count
      FROM anti_cheat_tracking
      WHERE key = ${key}
      LIMIT 1
    `;

    if (trackRows.length > 0) {
      const { last_submission_time, attempt_count } = trackRows[0];

      if (attempt_count > 5) {
        flags.push("rapid_attempts");
      }

      const elapsed = Date.now() - last_submission_time.getTime();
      if (elapsed < 1000) {
        flags.push("fast_submission");
      }

      if (correct && attempt_count === 1 && elapsed < 500) {
        flags.push("impossible_pattern");
      }
    }

    // Check excessive submissions from this wallet in the last 10 s
    const recentWalletCount = await sql<{ count: number }[]>`
      SELECT COUNT(*) AS count
      FROM anti_cheat_answers
      WHERE wallet = ${wallet}
        AND server_timestamp > NOW() - INTERVAL '10 seconds'
    `;
    if ((recentWalletCount[0]?.count ?? 0) > 10) {
      flags.push("excessive_frequency");
    }

    // Check for same IP with different wallets in last 5 min
    const sameIpRows = await sql<{ count: number }[]>`
      SELECT COUNT(DISTINCT wallet) AS count
      FROM anti_cheat_answers
      WHERE ip = ${ip}
        AND wallet <> ${wallet}
        AND server_timestamp > NOW() - INTERVAL '5 minutes'
    `;
    if ((sameIpRows[0]?.count ?? 0) > 3) {
      flags.push("suspicious_wallet_ip");
    }

    // Check for same wallet with different IPs in last hour
    const sameWalletRows = await sql<{ count: number }[]>`
      SELECT COUNT(DISTINCT ip) AS count
      FROM anti_cheat_answers
      WHERE wallet = ${wallet}
        AND ip <> ${ip}
        AND server_timestamp > NOW() - INTERVAL '1 hour'
    `;
    if ((sameWalletRows[0]?.count ?? 0) > 2) {
      flags.push("suspicious_wallet_ip");
    }
  } catch (err) {
    logger.error("[Anti-Cheat] detectAnomalies DB error:", err);
  }

  return flags;
}

export async function recordAnswer(
  huntId: number,
  clueId: number,
  wallet: string,
  ip: string,
  _answer: string,
  correct: boolean,
  clientTimestamp: number | null,
  score: number,
  bonusPoints: number,
  anomalyFlags: string[]
): Promise<void> {
  try {
    const sql = getDb();

    await sql`
      INSERT INTO anti_cheat_answers (
        hunt_id, clue_id, wallet, ip, correct,
        server_timestamp, client_timestamp,
        score, bonus_points, anomaly_flags
      )
      VALUES (
        ${huntId}, ${clueId}, ${wallet}, ${ip}, ${correct},
        NOW(),
        ${clientTimestamp !== null ? new Date(clientTimestamp) : null},
        ${score}, ${bonusPoints},
        ${sql.array(anomalyFlags)}
      )
    `;

    for (const flag of anomalyFlags) {
      const anomalyId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await sql`
        INSERT INTO anti_cheat_anomalies (
          id, wallet, ip, type, details, timestamp, hunt_id, clue_id
        )
        VALUES (
          ${anomalyId}, ${wallet}, ${ip}, ${flag},
          ${"huntId=" + huntId + " clueId=" + clueId + " correct=" + correct + " score=" + score},
          NOW(), ${huntId}, ${clueId}
        )
      `;
      logger.warn(`[Anti-Cheat] Anomaly detected: ${flag} - wallet=${wallet} ip=${ip}`);
    }
  } catch (err) {
    logger.error("[Anti-Cheat] recordAnswer DB error:", err);
  }
}

export async function isBanned(wallet: string, ip: string): Promise<boolean> {
  try {
    const sql = getDb();
    const rows = await sql<{ count: number }[]>`
      SELECT COUNT(*) AS count
      FROM anti_cheat_bans
      WHERE wallet = ${wallet} OR ip = ${ip}
    `;
    return (rows[0]?.count ?? 0) > 0;
  } catch (err) {
    logger.error("[Anti-Cheat] isBanned DB error:", err);
    return false;
  }
}

export async function getFlaggedUsers(): Promise<
  { wallet: string; ip: string; anomalyCount: number; lastAnomaly: number }[]
> {
  try {
    const sql = getDb();
    const rows = await sql<
      {
        wallet: string;
        ip: string;
        anomaly_count: number;
        last_anomaly: Date;
      }[]
    >`
      SELECT wallet, ip,
             COUNT(*) AS anomaly_count,
             MAX(timestamp) AS last_anomaly
      FROM anti_cheat_anomalies
      GROUP BY wallet, ip
      ORDER BY last_anomaly DESC
    `;
    return rows.map((r) => ({
      wallet: r.wallet,
      ip: r.ip,
      anomalyCount: Number(r.anomaly_count),
      lastAnomaly: r.last_anomaly.getTime(),
    }));
  } catch (err) {
    logger.error("[Anti-Cheat] getFlaggedUsers DB error:", err);
    return [];
  }
}

export async function getAnomalyHistory(wallet?: string): Promise<
  {
    id: string;
    wallet: string;
    ip: string;
    type: string;
    details: string;
    timestamp: number;
    huntId: number;
    clueId: number;
  }[]
> {
  try {
    const sql = getDb();
    const rows = await (wallet
      ? sql<
          {
            id: string;
            wallet: string;
            ip: string;
            type: string;
            details: string;
            timestamp: Date;
            hunt_id: number;
            clue_id: number;
          }[]
        >`
          SELECT id, wallet, ip, type, details, timestamp, hunt_id, clue_id
          FROM anti_cheat_anomalies
          WHERE wallet = ${wallet}
          ORDER BY timestamp DESC
        `
      : sql<
          {
            id: string;
            wallet: string;
            ip: string;
            type: string;
            details: string;
            timestamp: Date;
            hunt_id: number;
            clue_id: number;
          }[]
        >`
          SELECT id, wallet, ip, type, details, timestamp, hunt_id, clue_id
          FROM anti_cheat_anomalies
          ORDER BY timestamp DESC
        `);

    return rows.map((r) => ({
      id: r.id,
      wallet: r.wallet,
      ip: r.ip,
      type: r.type,
      details: r.details,
      timestamp: r.timestamp.getTime(),
      huntId: r.hunt_id,
      clueId: r.clue_id,
    }));
  } catch (err) {
    logger.error("[Anti-Cheat] getAnomalyHistory DB error:", err);
    return [];
  }
}

export async function getSubmissionHistory(wallet?: string): Promise<
  {
    huntId: number;
    clueId: number;
    wallet: string;
    ip: string;
    correct: boolean;
    serverTimestamp: number;
    clientTimestamp: number | null;
    score: number;
    bonusPoints: number;
    anomalyFlags: string[];
  }[]
> {
  try {
    const sql = getDb();
    const rows = await (wallet
      ? sql<
          {
            hunt_id: number;
            clue_id: number;
            wallet: string;
            ip: string;
            correct: boolean;
            server_timestamp: Date;
            client_timestamp: Date | null;
            score: number;
            bonus_points: number;
            anomaly_flags: string[];
          }[]
        >`
          SELECT hunt_id, clue_id, wallet, ip, correct, server_timestamp,
                 client_timestamp, score, bonus_points, anomaly_flags
          FROM anti_cheat_answers
          WHERE wallet = ${wallet}
          ORDER BY server_timestamp DESC
        `
      : sql<
          {
            hunt_id: number;
            clue_id: number;
            wallet: string;
            ip: string;
            correct: boolean;
            server_timestamp: Date;
            client_timestamp: Date | null;
            score: number;
            bonus_points: number;
            anomaly_flags: string[];
          }[]
        >`
          SELECT hunt_id, clue_id, wallet, ip, correct, server_timestamp,
                 client_timestamp, score, bonus_points, anomaly_flags
          FROM anti_cheat_answers
          ORDER BY server_timestamp DESC
        `);

    return rows.map((r) => ({
      huntId: r.hunt_id,
      clueId: r.clue_id,
      wallet: r.wallet,
      ip: r.ip,
      correct: r.correct,
      serverTimestamp: r.server_timestamp.getTime(),
      clientTimestamp: r.client_timestamp ? r.client_timestamp.getTime() : null,
      score: r.score,
      bonusPoints: r.bonus_points,
      anomalyFlags: r.anomaly_flags,
    }));
  } catch (err) {
    logger.error("[Anti-Cheat] getSubmissionHistory DB error:", err);
    return [];
  }
}

export async function getBannedUsers(): Promise<
  { wallet: string; ip: string; reason: string; bannedAt: number; bannedBy: string }[]
> {
  try {
    const sql = getDb();
    const rows = await sql<
      { wallet: string; ip: string; reason: string; banned_at: Date; banned_by: string }[]
    >`
      SELECT wallet, ip, reason, banned_at, banned_by
      FROM anti_cheat_bans
      ORDER BY banned_at DESC
    `;
    return rows.map((r) => ({
      wallet: r.wallet,
      ip: r.ip,
      reason: r.reason,
      bannedAt: r.banned_at.getTime(),
      bannedBy: r.banned_by,
    }));
  } catch (err) {
    logger.error("[Anti-Cheat] getBannedUsers DB error:", err);
    return [];
  }
}

export async function banUser(
  wallet: string,
  ip: string,
  reason: string,
  bannedBy: string
): Promise<void> {
  try {
    const sql = getDb();
    await sql`
      INSERT INTO anti_cheat_bans (wallet, ip, reason, banned_at, banned_by)
      VALUES (${wallet}, ${ip}, ${reason}, NOW(), ${bannedBy})
      ON CONFLICT (wallet) DO NOTHING
    `;
    logger.warn(
      `[Anti-Cheat] User banned: wallet=${wallet} ip=${ip} reason="${reason}" by=${bannedBy}`
    );
  } catch (err) {
    logger.error("[Anti-Cheat] banUser DB error:", err);
  }
}

export async function unbanUser(wallet: string): Promise<boolean> {
  try {
    const sql = getDb();
    const rows = await sql`
      DELETE FROM anti_cheat_bans
      WHERE wallet = ${wallet}
      RETURNING wallet
    `;
    if (rows.length > 0) {
      logger.info(`[Anti-Cheat] User unbanned: wallet=${wallet}`);
      return true;
    }
    return false;
  } catch (err) {
    logger.error("[Anti-Cheat] unbanUser DB error:", err);
    return false;
  }
}

export function calculateScore(
  huntId: number,
  clueId: number,
  correct: boolean
): { score: number; bonusPoints: number } {
  if (!correct) return { score: 0, bonusPoints: 0 };

  const clue = getServerClue(huntId, clueId);
  if (!clue) return { score: 0, bonusPoints: 0 };

  return { score: clue.points, bonusPoints: 0 };
}
