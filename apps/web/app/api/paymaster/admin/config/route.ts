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

import { NextResponse } from 'next/server';

import { AuthError } from '@/lib/api/errors';
import { withErrorHandling } from '@/lib/api/withErrorHandling';
import { withValidation } from '@/lib/api/withValidation';
import { getPaymasterConfig } from '@/lib/paymaster/config';
import { deleteConfigValue, getConfigValue, listUsers, setConfigValue } from '@/lib/paymaster/db';
import { CONFIG_KEYS, type PaymasterConfig, type PaymasterUserRecord } from '@/lib/paymaster/types';
import { paymasterAdminConfigBodySchema } from '@hunty/types/api-schemas';

export const dynamic = 'force-dynamic';

// ─── Auth check helper ─────────────────────────────────────────────────────

function requireAdmin(request: Request): void {
  const auth = request.headers.get('authorization');
  const secret = process.env.ADMIN_API_SECRET;

  if (!secret) {
    throw new AuthError('Paymaster admin is not configured (ADMIN_API_SECRET is not set).');
  }

  if (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== secret) {
    throw new AuthError('Invalid or missing admin authorization token.');
  }
}

// ─── GET ───────────────────────────────────────────────────────────────────

export const GET = withErrorHandling(async (request: Request) => {
  requireAdmin(request);

  const baseConfig = getPaymasterConfig();

  const maxSponsoredTx = await getConfigValue(CONFIG_KEYS.MAX_SPONSORED_TX);
  const maxBudgetPerUser = await getConfigValue(CONFIG_KEYS.MAX_BUDGET_PER_USER);
  const maxFeePerTx = await getConfigValue(CONFIG_KEYS.MAX_FEE_PER_TX);

  const effectiveConfig: PaymasterConfig = {
    maxSponsoredTx: Number(maxSponsoredTx ?? baseConfig.maxSponsoredTx),
    maxBudgetPerUserStroops: Number(maxBudgetPerUser ?? baseConfig.maxBudgetPerUserStroops),
    maxFeePerTxStroops: Number(maxFeePerTx ?? baseConfig.maxFeePerTxStroops),
    paymasterPublicKey: baseConfig.paymasterPublicKey,
  };

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
});

// ─── POST ──────────────────────────────────────────────────────────────────

export const POST = withValidation(
  { body: paymasterAdminConfigBodySchema },
  async (request, _context, { body }) => {
    requireAdmin(request);

    const updated: string[] = [];

    if (body.maxSponsoredTx !== undefined) {
      if (body.maxSponsoredTx === null) {
        await deleteConfigValue(CONFIG_KEYS.MAX_SPONSORED_TX);
        updated.push('maxSponsoredTx reverted to default');
      } else {
        await setConfigValue(CONFIG_KEYS.MAX_SPONSORED_TX, String(body.maxSponsoredTx));
        updated.push(`maxSponsoredTx → ${body.maxSponsoredTx}`);
      }
    }

    if (body.maxBudgetPerUserStroops !== undefined) {
      if (body.maxBudgetPerUserStroops === null) {
        await deleteConfigValue(CONFIG_KEYS.MAX_BUDGET_PER_USER);
        updated.push('maxBudgetPerUserStroops reverted to default');
      } else {
        await setConfigValue(CONFIG_KEYS.MAX_BUDGET_PER_USER, String(body.maxBudgetPerUserStroops));
        updated.push(`maxBudgetPerUserStroops → ${body.maxBudgetPerUserStroops}`);
      }
    }

    if (body.maxFeePerTxStroops !== undefined) {
      if (body.maxFeePerTxStroops === null) {
        await deleteConfigValue(CONFIG_KEYS.MAX_FEE_PER_TX);
        updated.push('maxFeePerTxStroops reverted to default');
      } else {
        await setConfigValue(CONFIG_KEYS.MAX_FEE_PER_TX, String(body.maxFeePerTxStroops));
        updated.push(`maxFeePerTxStroops → ${body.maxFeePerTxStroops}`);
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      config: getPaymasterConfig(),
    });
  }
);
