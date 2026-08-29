/**
 * GET/POST /api/paymaster/admin/config
 *
 * Admin controls for global paymaster sponsorship limits.
 *
 * GET  — Returns the current effective configuration (defaults + overrides).
 * POST — Updates one or more configuration values.
 *
 * Both endpoints require an `Authorization: Bearer <ADMIN_API_SECRET>` header.
 *
 * POST body (JSON):
 *   { "maxSponsoredTx": 5, "maxBudgetPerUserStroops": 20000000 }
 *
 * Only provided keys are updated; omitted keys keep their current value.
 * Set a key to `null` to delete the override and revert to the default.
 */

import { NextResponse } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { withAdminAuth } from "@/lib/api/withAuth";
import { getPaymasterConfig } from "@/lib/paymaster/config";
import {
  deleteConfigValue,
  getConfigValue,
  listUsers,
  setConfigValue,
} from "@/lib/paymaster/db";
import {
  CONFIG_KEYS,
  type AdminConfigUpdate,
  type PaymasterConfig,
  type PaymasterUserRecord,
} from "@/lib/paymaster/types";

export const dynamic = "force-dynamic";

// Auth is now centralized in `withAdminAuth` (see lib/api/withAuth.ts),
// which reuses the same ADMIN_API_SECRET bearer-token check this route
// used to implement inline.

// ─── GET ───────────────────────────────────────────────────────────────────

export const GET = withErrorHandling(
  withAdminAuth(async () => {
  const baseConfig = getPaymasterConfig();

  // Load any DB overrides
  const maxSponsoredTx = await getConfigValue(CONFIG_KEYS.MAX_SPONSORED_TX);
  const maxBudgetPerUser = await getConfigValue(CONFIG_KEYS.MAX_BUDGET_PER_USER);
  const maxFeePerTx = await getConfigValue(CONFIG_KEYS.MAX_FEE_PER_TX);

  const effectiveConfig: PaymasterConfig = {
    maxSponsoredTx: Number(maxSponsoredTx ?? baseConfig.maxSponsoredTx),
    maxBudgetPerUserStroops: Number(maxBudgetPerUser ?? baseConfig.maxBudgetPerUserStroops),
    maxFeePerTxStroops: Number(maxFeePerTx ?? baseConfig.maxFeePerTxStroops),
    paymasterPublicKey: baseConfig.paymasterPublicKey,
  };

  // Also return user summary stats
  const users: PaymasterUserRecord[] = await listUsers();

  const stats = {
    totalTrackedUsers: users.length,
    totalSponsoredTx: users.reduce((sum, u) => sum + u.sponsored_tx_count, 0),
    totalBudgetUsed: users.reduce((sum, u) => sum + Number(u.total_budget_sponsored), 0),
  };

  return NextResponse.json({
    config: effectiveConfig,
    stats,
    users: users.map((u) => ({
      walletAddress: u.wallet_address,
      sponsoredTxCount: u.sponsored_tx_count,
      totalBudgetSponsored: Number(u.total_budget_sponsored),
      updatedAt: u.updated_at,
    })),
  });
  })
);

// ─── POST ──────────────────────────────────────────────────────────────────

export const POST = withErrorHandling(
  withAdminAuth(async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Invalid JSON body");
  }

  const update = body as AdminConfigUpdate;
  const updated: string[] = [];

  // Update max sponsored transactions
  if (update.maxSponsoredTx !== undefined) {
    if (update.maxSponsoredTx === null) {
      await deleteConfigValue(CONFIG_KEYS.MAX_SPONSORED_TX);
      updated.push("maxSponsoredTx reverted to default");
    } else if (Number.isFinite(update.maxSponsoredTx) && update.maxSponsoredTx >= 0) {
      await setConfigValue(CONFIG_KEYS.MAX_SPONSORED_TX, String(update.maxSponsoredTx));
      updated.push(`maxSponsoredTx → ${update.maxSponsoredTx}`);
    } else {
      throw new ValidationError("maxSponsoredTx must be a non-negative integer");
    }
  }

  // Update max budget per user (stroops)
  if (update.maxBudgetPerUserStroops !== undefined) {
    if (update.maxBudgetPerUserStroops === null) {
      await deleteConfigValue(CONFIG_KEYS.MAX_BUDGET_PER_USER);
      updated.push("maxBudgetPerUserStroops reverted to default");
    } else if (Number.isFinite(update.maxBudgetPerUserStroops) && update.maxBudgetPerUserStroops >= 0) {
      await setConfigValue(
        CONFIG_KEYS.MAX_BUDGET_PER_USER,
        String(update.maxBudgetPerUserStroops),
      );
      updated.push(`maxBudgetPerUserStroops → ${update.maxBudgetPerUserStroops}`);
    } else {
      throw new ValidationError("maxBudgetPerUserStroops must be a non-negative integer");
    }
  }

  // Update max fee per transaction (stroops)
  if (update.maxFeePerTxStroops !== undefined) {
    if (update.maxFeePerTxStroops === null) {
      await deleteConfigValue(CONFIG_KEYS.MAX_FEE_PER_TX);
      updated.push("maxFeePerTxStroops reverted to default");
    } else if (Number.isFinite(update.maxFeePerTxStroops) && update.maxFeePerTxStroops >= 0) {
      await setConfigValue(CONFIG_KEYS.MAX_FEE_PER_TX, String(update.maxFeePerTxStroops));
      updated.push(`maxFeePerTxStroops → ${update.maxFeePerTxStroops}`);
    } else {
      throw new ValidationError("maxFeePerTxStroops must be a non-negative integer");
    }
  }

  return NextResponse.json({
    success: true,
    updated,
    config: getPaymasterConfig(),
  });
  })
);
