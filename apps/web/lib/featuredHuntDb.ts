/**
 * Persistent store for the "featured hunt of the week" setting.
 *
 * All reads and writes go through the shared PostgreSQL database, which means:
 *  - The value is consistent across every serverless instance.
 *  - The value survives deploys and instance recycling.
 *  - Failures propagate as thrown errors instead of being silently swallowed.
 *
 * The setting is stored in the `app_settings` table under
 * key = 'featured_hunt_id'.  Callers should `await` both functions and let
 * errors bubble up to the route-level `withErrorHandling` wrapper, which will
 * convert them into a proper HTTP 500 response.
 */

import { getDb } from "@/lib/db";

const SETTINGS_KEY = "featured_hunt_id";

/**
 * Read the current featured hunt ID from the database.
 *
 * Returns `null` when no hunt is featured.
 * Throws if the database is unavailable or the query fails.
 */
export async function readFeaturedId(): Promise<number | null> {
  const sql = getDb();
  const rows = await sql<{ value: string | null }[]>`
    SELECT value
    FROM   app_settings
    WHERE  key = ${SETTINGS_KEY}
    LIMIT  1
  `;
  if (rows.length === 0) return null;
  const raw = rows[0].value;
  if (raw === null || raw === "") return null;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Persist the featured hunt ID to the database.
 *
 * Pass `null` to clear the featured hunt.
 * Throws if the database is unavailable or the query fails.
 */
export async function writeFeaturedId(id: number | null): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${SETTINGS_KEY}, ${id !== null ? String(id) : null}, NOW())
    ON CONFLICT (key) DO UPDATE
      SET value      = EXCLUDED.value,
          updated_at = EXCLUDED.updated_at
  `;
}
