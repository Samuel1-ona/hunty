import { NextResponse } from "next/server"

import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

interface RateLimitConfig {
  limit: number
  windowMs: number
}

/**
 * Distributed rate limiter backed by PostgreSQL.
 *
 * Replaces the previous process-local `Map` which was wiped on every cold
 * start and was inconsistent across multiple serverless instances.
 *
 * Each call issues a single UPSERT that atomically increments the counter for
 * the current window, then reads back the new count.  Rows from expired
 * windows are ignored (they share a different `expires_at` and are excluded by
 * the WHERE clause).  A periodic cleanup job (or a simple DELETE WHERE
 * expires_at < NOW()) can prune stale rows.
 *
 * Graceful degradation: if the database is unavailable the call is allowed
 * through rather than silently dropping legitimate traffic.
 */
export async function rateLimit(
  ip: string,
  config: RateLimitConfig = { limit: 60, windowMs: 60 * 1000 }
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const now = Date.now();
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const expiresAt = new Date(windowStart + config.windowMs);
  const key = `ratelimit_${ip}`;

  try {
    const sql = getDb();

    // Atomically upsert the counter for this (key, window) pair.
    const rows = await sql<{ count: number }[]>`
      INSERT INTO rate_limit (key, count, expires_at)
      VALUES (${key}, 1, ${expiresAt})
      ON CONFLICT (key, expires_at) DO UPDATE
        SET count = rate_limit.count + 1
      RETURNING count
    `;

    const count = rows[0]?.count ?? 1;
    const reset = expiresAt.getTime();

    if (count > config.limit) {
      return { success: false, remaining: 0, reset };
    }

    return {
      success: true,
      remaining: Math.max(0, config.limit - count),
      reset,
    };
  } catch (err) {
    // Graceful degradation: allow the request if DB is unavailable.
    logger.error("[rate-limit] DB error, allowing request:", err);
    return {
      success: true,
      remaining: config.limit - 1,
      reset: now + config.windowMs,
    };
  }
}

export function getIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "127.0.0.1";
}

export function rateLimitResponse(reset: number) {
  return NextResponse.json(
    { error: "Too many requests. Please try again later.", code: "RATE_LIMITED" },
    {
      status: 429,
      headers: {
        "X-RateLimit-Reset": Math.ceil(reset / 1000).toString(),
        "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
      },
    },
  );
}
