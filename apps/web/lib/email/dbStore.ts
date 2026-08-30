/**
 * Email preferences database operations.
 *
 * Manages player email subscriptions, digest send history, and unsubscribe tokens.
 */

import { randomUUID } from 'crypto';

import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

import type { EmailDigestSend, EmailUnsubscribeToken, PlayerEmailPreference } from './types';

// ─── Conversion helpers ────────────────────────────────────────────────────

interface PreferenceRow {
  id: string;
  wallet_address: string;
  email: string;
  digest_subscribed: boolean;
  subscription_date: string | null;
  last_updated: string | null;
  created_at: string | null;
}

interface DigestSendRow {
  id: string;
  player_id: string;
  sent_at: string | null;
  recipient_email: string;
  hunt_ids: number[];
  categories: string[];
  success: boolean | null;
  error_message: string | null;
}

interface UnsubscribeTokenRow {
  id: string;
  player_id: string;
  token: string;
  created_at: string | null;
  expires_at: string | null;
  used_at: string | null;
}

function rowToPreference(row: PreferenceRow): PlayerEmailPreference {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    email: row.email,
    digestSubscribed: row.digest_subscribed,
    subscriptionDate: row.subscription_date ? new Date(row.subscription_date).getTime() : 0,
    lastUpdated: row.last_updated ? new Date(row.last_updated).getTime() : 0,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : 0,
  };
}

function rowToDigestSend(row: DigestSendRow): EmailDigestSend {
  return {
    id: row.id,
    playerId: row.player_id,
    sentAt: row.sent_at ? new Date(row.sent_at).getTime() : 0,
    recipientEmail: row.recipient_email,
    huntIds: row.hunt_ids || [],
    categories: row.categories || [],
    success: row.success ?? true,
    ...(row.error_message ? { errorMessage: row.error_message } : {}),
  };
}

function rowToUnsubscribeToken(row: UnsubscribeTokenRow): EmailUnsubscribeToken {
  return {
    id: row.id,
    playerId: row.player_id,
    token: row.token,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : 0,
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : 0,
    ...(row.used_at ? { usedAt: new Date(row.used_at).getTime() } : {}),
  };
}

// ─── Player Email Preferences ─────────────────────────────────────────────

export async function getEmailPreference(
  walletAddress: string
): Promise<PlayerEmailPreference | undefined> {
  try {
    const sql = getDb();
    const rows = await sql<PreferenceRow[]>`
      SELECT * FROM player_email_preferences
      WHERE wallet_address = ${walletAddress.toLowerCase()}
      LIMIT 1
    `;
    return rows.length > 0 ? rowToPreference(rows[0]) : undefined;
  } catch (err) {
    logger.error('Failed to get email preference:', err);
    throw err;
  }
}

export async function upsertEmailPreference(
  walletAddress: string,
  email: string,
  digestSubscribed: boolean
): Promise<PlayerEmailPreference> {
  try {
    const sql = getDb();
    const normalizedAddress = walletAddress.toLowerCase();
    const id = randomUUID();
    const now = new Date();

    const rows = await sql<PreferenceRow[]>`
      INSERT INTO player_email_preferences
        (id, wallet_address, email, digest_subscribed, subscription_date, last_updated, created_at)
      VALUES
        (${id}, ${normalizedAddress}, ${email}, ${digestSubscribed}, ${now}, ${now}, ${now})
      ON CONFLICT (wallet_address)
      DO UPDATE SET
        email = EXCLUDED.email,
        digest_subscribed = EXCLUDED.digest_subscribed,
        last_updated = NOW()
      RETURNING *
    `;

    return rowToPreference(rows[0]);
  } catch (err) {
    logger.error('Failed to upsert email preference:', err);
    throw err;
  }
}

export async function updateDigestSubscription(
  walletAddress: string,
  digestSubscribed: boolean
): Promise<PlayerEmailPreference> {
  try {
    const sql = getDb();
    const rows = await sql<PreferenceRow[]>`
      UPDATE player_email_preferences
      SET digest_subscribed = ${digestSubscribed},
          last_updated = NOW()
      WHERE wallet_address = ${walletAddress.toLowerCase()}
      RETURNING *
    `;

    if (rows.length === 0) {
      throw new Error(`Email preference not found for wallet: ${walletAddress}`);
    }

    return rowToPreference(rows[0]);
  } catch (err) {
    logger.error('Failed to update digest subscription:', err);
    throw err;
  }
}

export async function getAllSubscribedPlayers(): Promise<PlayerEmailPreference[]> {
  try {
    const sql = getDb();
    const rows = await sql<PreferenceRow[]>`
      SELECT * FROM player_email_preferences
      WHERE digest_subscribed = true
      ORDER BY last_updated DESC
    `;
    return rows.map(rowToPreference);
  } catch (err) {
    logger.error('Failed to get subscribed players:', err);
    throw err;
  }
}

// ─── Email Digest Send History ────────────────────────────────────────────

export async function recordDigestSend(
  playerId: string,
  email: string,
  huntIds: number[],
  categories: string[],
  success: boolean = true,
  errorMessage?: string
): Promise<EmailDigestSend> {
  try {
    const sql = getDb();
    const id = randomUUID();
    const now = new Date();

    const rows = await sql<DigestSendRow[]>`
      INSERT INTO email_digest_sends
        (id, player_id, sent_at, recipient_email, hunt_ids, categories, success, error_message)
      VALUES
        (${id}, ${playerId}, ${now}, ${email}, ${huntIds}, ${categories}, ${success}, ${errorMessage ?? null})
      RETURNING *
    `;

    return rowToDigestSend(rows[0]);
  } catch (err) {
    logger.error('Failed to record digest send:', err);
    throw err;
  }
}

export async function getLastDigestSend(playerId: string): Promise<EmailDigestSend | undefined> {
  try {
    const sql = getDb();
    const rows = await sql<DigestSendRow[]>`
      SELECT * FROM email_digest_sends
      WHERE player_id = ${playerId}
      ORDER BY sent_at DESC
      LIMIT 1
    `;
    return rows.length > 0 ? rowToDigestSend(rows[0]) : undefined;
  } catch (err) {
    logger.error('Failed to get last digest send:', err);
    throw err;
  }
}

// ─── Unsubscribe Tokens ────────────────────────────────────────────────────

export async function createUnsubscribeToken(
  playerId: string,
  expiryDays: number = 90 // Tokens valid for 90 days
): Promise<EmailUnsubscribeToken> {
  try {
    const sql = getDb();
    const id = randomUUID();
    const token = randomUUID().replace(/-/g, '').substring(0, 32);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

    const rows = await sql<UnsubscribeTokenRow[]>`
      INSERT INTO email_unsubscribe_tokens
        (id, player_id, token, created_at, expires_at)
      VALUES
        (${id}, ${playerId}, ${token}, ${now}, ${expiresAt})
      RETURNING *
    `;

    return rowToUnsubscribeToken(rows[0]);
  } catch (err) {
    logger.error('Failed to create unsubscribe token:', err);
    throw err;
  }
}

export async function validateAndUseUnsubscribeToken(token: string): Promise<{
  playerId: string;
  walletAddress: string;
  email: string;
} | null> {
  try {
    const sql = getDb();

    // Find the token, check it's not used and not expired
    const rows = await sql<
      {
        id: string;
        player_id: string;
        used_at: string | null;
        expires_at: string | null;
      }[]
    >`
      SELECT id, player_id, used_at, expires_at
      FROM email_unsubscribe_tokens
      WHERE token = ${token}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return null;
    }

    const tokenRecord = rows[0];

    // Check if already used
    if (tokenRecord.used_at) {
      return null;
    }

    // Check if expired
    const expiresAt = new Date(tokenRecord.expires_at!);
    if (new Date() > expiresAt) {
      return null;
    }

    // Mark as used
    await sql`
      UPDATE email_unsubscribe_tokens
      SET used_at = NOW()
      WHERE id = ${tokenRecord.id}
    `;

    // Get player info
    const playerRows = await sql<PreferenceRow[]>`
      SELECT * FROM player_email_preferences
      WHERE id = ${tokenRecord.player_id}
      LIMIT 1
    `;

    if (playerRows.length === 0) {
      return null;
    }

    const player = playerRows[0];

    // Unsubscribe the player
    await sql`
      UPDATE player_email_preferences
      SET digest_subscribed = false, last_updated = NOW()
      WHERE id = ${tokenRecord.player_id}
    `;

    return {
      playerId: player.id,
      walletAddress: player.wallet_address,
      email: player.email,
    };
  } catch (err) {
    logger.error('Failed to validate unsubscribe token:', err);
    throw err;
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────────────

export async function deleteExpiredUnsubscribeTokens(): Promise<number> {
  try {
    const sql = getDb();
    const result = await sql`
      DELETE FROM email_unsubscribe_tokens
      WHERE expires_at < NOW()
    `;
    return result.count;
  } catch (err) {
    logger.error('Failed to delete expired tokens:', err);
    throw err;
  }
}
