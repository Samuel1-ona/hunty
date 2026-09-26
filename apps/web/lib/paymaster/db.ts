/**
 * Paymaster database operations.
 *
 * Uses the shared PostgreSQL client from `@/lib/db` to read/write
 * sponsorship quotas, budgets, and transaction logs.
 *
 * All server-side only — never import in client components.
 */

import { getDb } from "@/lib/db";

import type {
  PaymasterConfigRecord,
  PaymasterTxRecord,
  PaymasterUserRecord,
} from "./types";

// ─── Users (quota / budget) ────────────────────────────────────────────────

/**
 * Ensure a user row exists in `paymaster_users`. If it doesn't, insert it
 * with the default sponsorship limits. Returns the current record.
 */
export async function ensureUser(walletAddress: string): Promise<PaymasterUserRecord> {
  const sql = getDb();

  // Try an upsert: if the row exists this is a no-op; otherwise insert defaults.
  const [row] = await sql`
    INSERT INTO paymaster_users (wallet_address)
    VALUES (${walletAddress})
    ON CONFLICT (wallet_address) DO NOTHING
    RETURNING *
  `;

  if (row) return row as unknown as PaymasterUserRecord;

  // Row already existed — fetch it.
  return getUser(walletAddress);
}

/**
 * Fetch a single user record by wallet address.
 * @throws if the user does not exist.
 */
export async function getUser(walletAddress: string): Promise<PaymasterUserRecord> {
  const sql = getDb();
  const [row] = await sql`
    SELECT * FROM paymaster_users WHERE wallet_address = ${walletAddress}
  `;
  if (!row) throw new Error(`Paymaster user not found: ${walletAddress}`);
  return row as unknown as PaymasterUserRecord;
}

/**
 * Atomically increment the sponsorship counters for a user.
 * Returns the updated record.
 */
export async function incrementSponsorship(
  walletAddress: string,
  feeStroops: number,
  txHash: string,
  innerTxHash?: string,
): Promise<PaymasterUserRecord> {
  const sql = getDb();

  const [row] = await sql`
    UPDATE paymaster_users
    SET
      sponsored_tx_count = sponsored_tx_count + 1,
      total_budget_sponsored = total_budget_sponsored + ${feeStroops},
      updated_at = NOW()
    WHERE wallet_address = ${walletAddress}
    RETURNING *
  `;

  // Log the transaction
  await sql`
    INSERT INTO paymaster_transactions (wallet_address, tx_hash, inner_tx_hash, fee_sponsored)
    VALUES (${walletAddress}, ${txHash}, ${innerTxHash ?? null}, ${feeStroops})
  `;

  if (!row) throw new Error(`Failed to increment sponsorship for: ${walletAddress}`);
  return row as unknown as PaymasterUserRecord;
}

// ─── Transactions (audit log) ──────────────────────────────────────────────

/**
 * Return the most recent sponsored transactions for a wallet.
 */
export async function getTransactionHistory(
  walletAddress: string,
  limit = 50,
): Promise<PaymasterTxRecord[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM paymaster_transactions
    WHERE wallet_address = ${walletAddress}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows as unknown as PaymasterTxRecord[];
}

/**
 * Return all sponsored transactions (admin view), newest first.
 */
export async function getAllTransactions(limit = 100, offset = 0): Promise<PaymasterTxRecord[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM paymaster_transactions
    ORDER BY created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
  return rows as unknown as PaymasterTxRecord[];
}

// ─── Global config overrides ───────────────────────────────────────────────

/**
 * Get a single config override value. Returns `null` if not set.
 */
export async function getConfigValue(key: string): Promise<string | null> {
  const sql = getDb();
  const [row] = await sql`
    SELECT value FROM paymaster_config WHERE key = ${key}
  `;
  return row ? (row as unknown as PaymasterConfigRecord).value : null;
}

/**
 * Set or update a config override value.
 */
export async function setConfigValue(key: string, value: string): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO paymaster_config (key, value)
    VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = ${value}
  `;
}

/**
 * Delete a config override value (revert to default).
 */
export async function deleteConfigValue(key: string): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM paymaster_config WHERE key = ${key}`;
}

// ─── Admin helpers ─────────────────────────────────────────────────────────

/**
 * List all tracked paymaster users with their usage stats.
 */
export async function listUsers(): Promise<PaymasterUserRecord[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM paymaster_users ORDER BY updated_at DESC
  `;
  return rows as unknown as PaymasterUserRecord[];
}

/**
 * Update sponsorship limits for a specific user.
 */
export async function updateUserLimits(
  walletAddress: string,
  limits: { maxSponsoredTx?: number; maxBudgetPerUser?: number },
): Promise<PaymasterUserRecord> {
  const sql = getDb();

  const sets: string[] = [];
  if (limits.maxSponsoredTx !== undefined) sets.push(`max_sponsored_tx = ${limits.maxSponsoredTx}`);
  if (limits.maxBudgetPerUser !== undefined) sets.push(`max_budget_per_user = ${limits.maxBudgetPerUser}`);

  if (sets.length === 0) throw new Error("No limits to update");

  const [row] = await sql`
    UPDATE paymaster_users
    SET ${sql(sets.join(", "))}, updated_at = NOW()
    WHERE wallet_address = ${walletAddress}
    RETURNING *
  `;

  if (!row) throw new Error(`User not found: ${walletAddress}`);
  return row as unknown as PaymasterUserRecord;
}
