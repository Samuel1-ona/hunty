/**
 * Paymaster configuration defaults and helpers.
 *
 * Global overrides can be stored in the `paymaster_config` database table.
 * These defaults are used when no DB override exists.
 */

import {
  DEFAULT_MAX_BUDGET_PER_USER,
  DEFAULT_MAX_FEE_PER_TX,
  DEFAULT_MAX_SPONSORED_TX,
  type PaymasterConfig,
} from "./types";

/**
 * Returns the effective paymaster configuration.
 *
 * In the current implementation these are static defaults. In the future
 * they can be loaded from the `paymaster_config` DB table and cached with
 * a short TTL so admin updates take effect quickly without a restart.
 */
export function getPaymasterConfig(): PaymasterConfig {
  return {
    maxSponsoredTx: DEFAULT_MAX_SPONSORED_TX,
    maxBudgetPerUserStroops: DEFAULT_MAX_BUDGET_PER_USER,
    maxFeePerTxStroops: DEFAULT_MAX_FEE_PER_TX,
    paymasterPublicKey: process.env.NEXT_PUBLIC_PAYMASTER_PUBLIC_KEY,
  };
}

/**
 * Utility to parse a numeric config value from the DB or env with a fallback.
 */
export function parseNumericConfig(
  raw: string | undefined | null,
  fallback: number,
): number {
  if (raw === undefined || raw === null) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
