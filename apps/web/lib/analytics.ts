/**
 * Hunt view and hint-usage analytics.
 *
 * All reads and writes go through PostgreSQL via the shared `getDb()` client.
 *
 * Tables (see migration 008_create_analytics.sql):
 *   hunt_views          — one row per hunt, view count incremented atomically
 *   hint_usage_events   — append-only log of hint-reveal events
 *
 * Graceful degradation: every exported function catches DB errors and returns
 * a safe empty/zero value rather than letting analytics failures surface to
 * end-users.
 */

import crypto from 'crypto';

import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

// ─── Hunt view analytics ──────────────────────────────────────────────────────

export type HuntViewStats = {
  huntId: number;
  views: number;
};

export function hashHuntId(huntId: number): string {
  const secret = process.env.HUNT_VIEW_ANALYTICS_SECRET || 'hunty-analytics-secret';
  return crypto.createHmac('sha256', secret).update(String(huntId)).digest('hex');
}

/**
 * Increment the view counter for a hunt and return the updated count.
 * Uses an atomic UPSERT so concurrent requests never produce a lost-update.
 */
export async function recordHuntView(huntId: number): Promise<HuntViewStats> {
  try {
    const sql = getDb();
    const rows = await sql<{ views: number }[]>`
      INSERT INTO hunt_views (hunt_id, views, last_viewed_at)
      VALUES (${huntId}, 1, NOW())
      ON CONFLICT (hunt_id) DO UPDATE
        SET views          = hunt_views.views + 1,
            last_viewed_at = NOW()
      RETURNING views
    `;
    const views = rows[0]?.views ?? 1;

    // Optional external analytics forwarding (unchanged from original)
    if (process.env.HUNT_VIEW_ANALYTICS_ENDPOINT) {
      const endpoint = process.env.HUNT_VIEW_ANALYTICS_ENDPOINT;
      const payload = {
        event: 'hunt_view',
        huntIdHash: hashHuntId(huntId),
        source: 'hunt_detail_page',
        timestamp: new Date().toISOString(),
      };
      try {
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.HUNT_VIEW_ANALYTICS_KEY
              ? { Authorization: `Bearer ${process.env.HUNT_VIEW_ANALYTICS_KEY}` }
              : {}),
          },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        logger.warn('Failed to forward hunt view analytics', error);
      }
    }

    return { huntId, views };
  } catch (err) {
    logger.error('[analytics] recordHuntView DB error:', err);
    return { huntId, views: 0 };
  }
}

export async function getHuntViewCount(huntId: number): Promise<number> {
  try {
    const sql = getDb();
    const rows = await sql<{ views: number }[]>`
      SELECT views FROM hunt_views WHERE hunt_id = ${huntId} LIMIT 1
    `;
    return rows[0]?.views ?? 0;
  } catch (err) {
    logger.error('[analytics] getHuntViewCount DB error:', err);
    return 0;
  }
}

export async function getAllHuntViewCounts(): Promise<HuntViewStats[]> {
  try {
    const sql = getDb();
    const rows = await sql<{ hunt_id: number; views: number }[]>`
      SELECT hunt_id, views FROM hunt_views ORDER BY hunt_id
    `;
    return rows.map((r) => ({ huntId: r.hunt_id, views: r.views }));
  } catch (err) {
    logger.error('[analytics] getAllHuntViewCounts DB error:', err);
    return [];
  }
}

// ─── Hint usage analytics ─────────────────────────────────────────────────────

export type HintUsageEvent = {
  huntId: number;
  clueId: number;
  hintIndex: number;
  wallet: string;
  timestamp: string;
};

export type HintUsageStats = {
  huntId: number;
  clueId: number;
  hintIndex: number;
  totalReveals: number;
};

/**
 * Record a single hint reveal event.
 * The wallet address is HMAC-hashed before storage so raw addresses are never persisted.
 */
export async function recordHintUsage(
  huntId: number,
  clueId: number,
  hintIndex: number,
  wallet: string
): Promise<void> {
  try {
    const secret = process.env.HUNT_VIEW_ANALYTICS_SECRET || 'hunty-analytics-secret';
    const walletHash = crypto.createHmac('sha256', secret).update(wallet).digest('hex');

    const sql = getDb();
    await sql`
      INSERT INTO hint_usage_events (hunt_id, clue_id, hint_index, wallet_hash, occurred_at)
      VALUES (${huntId}, ${clueId}, ${hintIndex}, ${walletHash}, NOW())
    `;

    // Optional external analytics forwarding
    if (process.env.HUNT_VIEW_ANALYTICS_ENDPOINT) {
      const payload = {
        event: 'hint_used',
        huntIdHash: hashHuntId(huntId),
        clueId,
        hintIndex,
        timestamp: new Date().toISOString(),
      };
      try {
        await fetch(process.env.HUNT_VIEW_ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.HUNT_VIEW_ANALYTICS_KEY
              ? { Authorization: `Bearer ${process.env.HUNT_VIEW_ANALYTICS_KEY}` }
              : {}),
          },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        logger.warn('Failed to forward hint usage analytics', error);
      }
    }
  } catch (err) {
    logger.error('[analytics] recordHintUsage DB error:', err);
  }
}

/**
 * Return aggregated hint usage counts grouped by hunt + clue + hintIndex.
 */
export async function getHintUsageStats(huntId: number): Promise<HintUsageStats[]> {
  try {
    const sql = getDb();
    const rows = await sql<
      {
        hunt_id: number;
        clue_id: number;
        hint_index: number;
        total_reveals: number;
      }[]
    >`
      SELECT hunt_id, clue_id, hint_index, COUNT(*) AS total_reveals
      FROM hint_usage_events
      WHERE hunt_id = ${huntId}
      GROUP BY hunt_id, clue_id, hint_index
      ORDER BY clue_id, hint_index
    `;
    return rows.map((r) => ({
      huntId: r.hunt_id,
      clueId: r.clue_id,
      hintIndex: r.hint_index,
      totalReveals: Number(r.total_reveals),
    }));
  } catch (err) {
    logger.error('[analytics] getHintUsageStats DB error:', err);
    return [];
  }
}
