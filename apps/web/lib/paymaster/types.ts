/**
 * Type definitions for the Paymaster fee-abstraction service.
 *
 * The paymaster sponsors transaction fees for new users so they can
 * interact with the app without needing XLM for gas. Each user gets a
 * quota of sponsored transactions and a total sponsored-fee budget.
 * Once either limit is exceeded the client falls back to user-paid fees.
 */

/** Default sponsorship quota for a new user. */
export const DEFAULT_MAX_SPONSORED_TX = 3;

/** Default XLM budget per user (in stroops — 1 XLM = 10_000_000 stroops). */
export const DEFAULT_MAX_BUDGET_PER_USER = 10_000_000; // 1 XLM

/** Default max fee per sponsored transaction (stroops). */
export const DEFAULT_MAX_FEE_PER_TX = 100_000; // 0.01 XLM

/** Key used in the paymaster_config table for global overrides. */
export const CONFIG_KEYS = {
  MAX_SPONSORED_TX: "max_sponsored_tx",
  MAX_BUDGET_PER_USER: "max_budget_per_user_stroops",
  MAX_FEE_PER_TX: "max_fee_per_tx_stroops",
  PAYMASTER_PUBLIC_KEY: "paymaster_public_key",
} as const;

// ─── API Types ─────────────────────────────────────────────────────────────

export interface SponsorRequest {
  /** The original transaction XDR the user wants sponsored. */
  txXdr: string;
  /** Stellar G-address of the user requesting sponsorship. */
  walletAddress: string;
}

export interface SponsorResponse {
  /** Whether the sponsorship was accepted. */
  sponsored: boolean;
  /**
   * If `sponsored === true`, the fee-bump transaction XDR signed by the
   * paymaster. The client must submit this to the network.
   */
  feeBumpTxXdr?: string;
  /**
   * If `sponsored === false`, a reason explaining the fallback to
   * user-paid fees.
   */
  reason?: string;
  /** Remaining sponsored transaction count after this request. */
  remainingTx: number;
  /** Remaining sponsored budget (stroops) after this request. */
  remainingBudget: number;
}

export interface BudgetInfo {
  walletAddress: string;
  /** How many sponsored transactions this user has used. */
  usedTx: number;
  /** Maximum sponsored transactions allowed. */
  maxTx: number;
  /** How many stroops of sponsored fees this user has consumed. */
  usedBudget: number;
  /** Maximum sponsored budget in stroops. */
  maxBudget: number;
  /** Whether the user is still eligible for sponsorship. */
  eligible: boolean;
}

export interface PaymasterConfig {
  maxSponsoredTx: number;
  maxBudgetPerUserStroops: number;
  maxFeePerTxStroops: number;
  paymasterPublicKey?: string;
}

export interface AdminConfigUpdate {
  maxSponsoredTx?: number;
  maxBudgetPerUserStroops?: number;
  maxFeePerTxStroops?: number;
}

// ─── Database Records ──────────────────────────────────────────────────────

export interface PaymasterUserRecord {
  wallet_address: string;
  sponsored_tx_count: number;
  total_budget_sponsored: number; // stroops
  max_sponsored_tx: number;
  max_budget_per_user: number;    // stroops
  created_at: Date;
  updated_at: Date;
}

export interface PaymasterTxRecord {
  id: number;
  wallet_address: string;
  tx_hash: string;
  fee_sponsored: number; // stroops
  inner_tx_hash?: string;
  created_at: Date;
}

export interface PaymasterConfigRecord {
  key: string;
  value: string;
}
