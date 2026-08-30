/**
 * Paymaster service — sponsors transaction fees for new users.
 *
 * The paymaster wraps a Stellar keypair that signs fee-bump transactions,
 * covering the network fee so users don't need XLM for their first few
 * interactions. Quotas and budgets are tracked per wallet via PostgreSQL.
 *
 * @module paymaster
 */

import * as Sentry from '@sentry/nextjs';
import {
  FeeBumpTransaction,
  Keypair,
  Networks,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

import { getPaymasterConfig, parseNumericConfig } from './paymaster/config';
import { ensureUser, getConfigValue, incrementSponsorship } from './paymaster/db';
import { CONFIG_KEYS, type SponsorResponse } from './paymaster/types';

// ─── Singleton instance ────────────────────────────────────────────────────

let _instance: StellarPaymaster | null = null;

/**
 * Returns the singleton StellarPaymaster instance, initialising it from
 * environment variables on first call.
 *
 * The paymaster secret must be set in `PAYMASTER_SECRET` (server-side env).
 */
export function getPaymaster(): StellarPaymaster {
  if (!_instance) {
    const secret = process.env.PAYMASTER_SECRET;
    if (!secret) {
      throw new Error(
        'PAYMASTER_SECRET environment variable is not set. ' +
          'The paymaster service cannot start without a funded Stellar keypair.'
      );
    }
    _instance = new StellarPaymaster(
      secret,
      process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE ?? Networks.TESTNET
    );
  }
  return _instance;
}

/**
 * Resets the singleton (useful in tests).
 */
export function resetPaymaster(): void {
  _instance = null;
}

// ─── Paymaster class ───────────────────────────────────────────────────────

export class StellarPaymaster {
  readonly paymasterKey: Keypair;
  private readonly network: string;

  constructor(paymasterSecret: string, network?: string) {
    this.paymasterKey = Keypair.fromSecret(paymasterSecret);
    this.network = network ?? Networks.TESTNET;
  }

  /**
   * The Stellar G-address of this paymaster.
   */
  get publicKey(): string {
    return this.paymasterKey.publicKey();
  }

  /**
   * Check whether a user is eligible for sponsorship and, if so, create a
   * fee-bump transaction signed by the paymaster.
   *
   * Eligibility rules:
   * 1. User must not have exceeded their per-user sponsored tx count.
   * 2. User must not have exceeded their per-user sponsored budget.
   * 3. The requested fee must not exceed the per-transaction max fee.
   *
   * @param txXdr        - Standard transaction XDR (not a fee-bump).
   * @param walletAddress - Stellar G-address of the user.
   * @returns A {@link SponsorResponse} indicating whether the tx was sponsored.
   */
  async sponsorTransaction(txXdr: string, walletAddress: string): Promise<SponsorResponse> {
    // ── 1. Determine effective limits ────────────────────────────────
    const maxSponsoredTx = await this._getEffectiveMaxTx();
    const maxBudgetPerUser = await this._getEffectiveMaxBudget();
    const maxFeePerTx = await this._getEffectiveMaxFee();

    // ── 2. Ensure user is tracked & check quota ──────────────────────
    const user = await ensureUser(walletAddress);
    const { sponsored_tx_count, total_budget_sponsored } = user;

    if (sponsored_tx_count >= maxSponsoredTx) {
      return {
        sponsored: false,
        reason: `Sponsorship quota exhausted: used ${sponsored_tx_count}/${maxSponsoredTx} sponsored transactions.`,
        remainingTx: 0,
        remainingBudget: Math.max(0, maxBudgetPerUser - total_budget_sponsored),
      };
    }

    if (total_budget_sponsored >= maxBudgetPerUser) {
      return {
        sponsored: false,
        reason: `Sponsorship budget exhausted: used ${total_budget_sponsored}/${maxBudgetPerUser} stroops.`,
        remainingTx: maxSponsoredTx - sponsored_tx_count,
        remainingBudget: 0,
      };
    }

    // ── 3. Parse and validate the user's transaction ─────────────────
    let userTx: Transaction;
    try {
      const parsed = TransactionBuilder.fromXDR(txXdr, this.network);
      if (parsed instanceof FeeBumpTransaction) {
        return {
          sponsored: false,
          reason: 'Expected a standard transaction XDR, not a fee-bump.',
          remainingTx: maxSponsoredTx - sponsored_tx_count,
          remainingBudget: Math.max(0, maxBudgetPerUser - total_budget_sponsored),
        };
      }
      userTx = parsed;
    } catch (err) {
      Sentry.captureException(err, {
        tags: { source: 'paymaster' },
        extra: { walletAddress },
      });
      return {
        sponsored: false,
        reason: 'Invalid transaction XDR.',
        remainingTx: maxSponsoredTx - sponsored_tx_count,
        remainingBudget: Math.max(0, maxBudgetPerUser - total_budget_sponsored),
      };
    }

    // ── 4. Determine the fee — use the user's declared base fee ──────
    const declaredFee = userTx.fee;
    const feeStroops = Math.min(declaredFee, maxFeePerTx);

    // Check remaining budget with this fee taken into account
    const estimatedBudgetAfter = total_budget_sponsored + feeStroops;
    if (estimatedBudgetAfter > maxBudgetPerUser) {
      return {
        sponsored: false,
        reason: `Sponsored fee (${feeStroops} stroops) would exceed remaining budget (${maxBudgetPerUser - total_budget_sponsored} stroops).`,
        remainingTx: maxSponsoredTx - sponsored_tx_count,
        remainingBudget: Math.max(0, maxBudgetPerUser - total_budget_sponsored),
      };
    }

    // ── 5. Build and sign the fee-bump transaction ───────────────────
    try {
      const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
        this.paymasterKey,
        String(feeStroops),
        userTx,
        this.network
      );

      feeBumpTx.sign(this.paymasterKey);
      const feeBumpXdr = feeBumpTx.toXDR();

      // ── 6. Persist the sponsorship increment ───────────────────────
      // The inner tx hash is available before submission; the outer
      // (fee-bump) hash can be provided later via a confirmation call.
      const innerHash = userTx.hash().toString('hex');
      await incrementSponsorship(walletAddress, feeStroops, innerHash);

      return {
        sponsored: true,
        feeBumpTxXdr: feeBumpXdr,
        remainingTx: maxSponsoredTx - (sponsored_tx_count + 1),
        remainingBudget: maxBudgetPerUser - estimatedBudgetAfter,
      };
    } catch (err) {
      Sentry.captureException(err, {
        tags: { source: 'paymaster' },
        extra: { walletAddress, feeStroops },
      });
      return {
        sponsored: false,
        reason: 'Failed to create fee-bump transaction. Please try again.',
        remainingTx: maxSponsoredTx - sponsored_tx_count,
        remainingBudget: Math.max(0, maxBudgetPerUser - total_budget_sponsored),
      };
    }
  }

  /**
   * Create a raw fee-bump XDR without quota/budget checks.
   * Useful for admin-initiated or off-chain operations.
   */
  async createFeeBump(userTxXdr: string, maxFee?: number): Promise<string> {
    const userTx = TransactionBuilder.fromXDR(userTxXdr, this.network);

    if (userTx instanceof FeeBumpTransaction) {
      throw new Error('Expected a standard transaction XDR, received a fee-bump transaction.');
    }

    const fee = maxFee ?? 100_000; // default 0.01 XLM
    const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
      this.paymasterKey,
      String(fee),
      userTx,
      this.network
    );

    feeBumpTx.sign(this.paymasterKey);
    return feeBumpTx.toXDR();
  }

  /**
   * Retrieve the effective max sponsored tx count from DB config or default.
   */
  private async _getEffectiveMaxTx(): Promise<number> {
    const override = await getConfigValue(CONFIG_KEYS.MAX_SPONSORED_TX);
    return parseNumericConfig(override, getPaymasterConfig().maxSponsoredTx);
  }

  /**
   * Retrieve the effective max budget per user from DB config or default.
   */
  private async _getEffectiveMaxBudget(): Promise<number> {
    const override = await getConfigValue(CONFIG_KEYS.MAX_BUDGET_PER_USER);
    return parseNumericConfig(override, getPaymasterConfig().maxBudgetPerUserStroops);
  }

  /**
   * Retrieve the effective max fee per tx from DB config or default.
   */
  private async _getEffectiveMaxFee(): Promise<number> {
    const override = await getConfigValue(CONFIG_KEYS.MAX_FEE_PER_TX);
    return parseNumericConfig(override, getPaymasterConfig().maxFeePerTxStroops);
  }
}
