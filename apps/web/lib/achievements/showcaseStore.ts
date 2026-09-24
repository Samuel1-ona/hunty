import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { getDb } from "@/lib/db";

import type { AchievementId } from "./config";

const SETTINGS_PREFIX = "achievement_showcase:";
const MAX_PINNED_ACHIEVEMENTS = 3;

interface StoredShowcase {
  ownerSecret: string;
  pinned: AchievementId[];
}

function keyFor(address: string): string {
  return `${SETTINGS_PREFIX}${address.toLowerCase()}`;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function secretsMatch(expected: string, received: string | undefined): boolean {
  return Boolean(received) && timingSafeEqual(digest(expected), digest(received as string));
}

async function getStoredShowcase(address: string): Promise<StoredShowcase | null> {
  const sql = getDb();
  const rows = await sql<{ value: string }[]>`
    SELECT value FROM app_settings WHERE key = ${keyFor(address)} LIMIT 1
  `;
  if (!rows.length) return null;

  try {
    return JSON.parse(rows[0].value) as StoredShowcase;
  } catch {
    return null;
  }
}

export async function getPublicPinnedAchievements(address: string): Promise<AchievementId[]> {
  return (await getStoredShowcase(address))?.pinned ?? [];
}

export async function savePinnedAchievements(
  address: string,
  pinned: AchievementId[],
  ownerSecret?: string
): Promise<{ pinned: AchievementId[]; ownerSecret?: string } | null> {
  if (pinned.length > MAX_PINNED_ACHIEVEMENTS || new Set(pinned).size !== pinned.length)
    return null;

  const existing = await getStoredShowcase(address);
  if (existing && !secretsMatch(existing.ownerSecret, ownerSecret)) return null;

  const secret = existing?.ownerSecret ?? randomBytes(32).toString("hex");
  const value = JSON.stringify({ ownerSecret: secret, pinned });
  const sql = getDb();
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${keyFor(address)}, ${value}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;

  return { pinned, ...(existing ? {} : { ownerSecret: secret }) };
}
