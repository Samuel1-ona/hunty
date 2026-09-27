/**
 * GET /api/paymaster/budget/[wallet]
 *
 * Returns the sponsorship budget status for a given wallet address.
 * Useful for the client to check eligibility before attempting to submit
 * a transaction for sponsorship.
 *
 * Response (200):
 *   {
 *     "walletAddress": "G-...",
 *     "usedTx": 1,
 *     "maxTx": 3,
 *     "usedBudget": 100000,
 *     "maxBudget": 10000000,
 *     "eligible": true
 *   }
 */

import { NextResponse } from "next/server";

import { NotFoundError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { getPaymasterConfig } from "@/lib/paymaster/config";
import { ensureUser, getConfigValue } from "@/lib/paymaster/db";
import {
  CONFIG_KEYS,
  type BudgetInfo,
} from "@/lib/paymaster/types";
import { parseNumericConfig } from "@/lib/paymaster/config";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(
  async (_request: Request, { params }: { params: Promise<{ wallet: string }> }) => {
    const { wallet } = await params;

    if (!wallet.startsWith("G") || wallet.length !== 56) {
      throw new NotFoundError("Invalid wallet address");
    }

    // Ensure the user is tracked (creates row with defaults if new).
    const user = await ensureUser(wallet);

    // Get effective limits (respecting any DB overrides).
    const maxTxOverride = await getConfigValue(CONFIG_KEYS.MAX_SPONSORED_TX);
    const maxBudgetOverride = await getConfigValue(CONFIG_KEYS.MAX_BUDGET_PER_USER);
    const defaults = getPaymasterConfig();

    const maxTx = parseNumericConfig(maxTxOverride, defaults.maxSponsoredTx);
    const maxBudget = parseNumericConfig(maxBudgetOverride, defaults.maxBudgetPerUserStroops);

    const eligible =
      user.sponsored_tx_count < maxTx &&
      user.total_budget_sponsored < maxBudget;

    const info: BudgetInfo = {
      walletAddress: wallet,
      usedTx: user.sponsored_tx_count,
      maxTx,
      usedBudget: user.total_budget_sponsored,
      maxBudget,
      eligible,
    };

    return NextResponse.json(info);
  },
);
