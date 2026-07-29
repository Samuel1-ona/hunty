/**
 * POST /api/paymaster/sponsor
 *
 * Submit a transaction for the paymaster to sponsor. The paymaster will
 * check the user's quota and budget, and if eligible, return a signed
 * fee-bump XDR the client can submit to the network.
 *
 * Request body (JSON):
 *   { "txXdr": "<base64 transaction XDR>", "walletAddress": "G-..." }
 *
 * Success (200):
 *   { "sponsored": true, "feeBumpTxXdr": "...", "remainingTx": 2, "remainingBudget": 5000000 }
 *
 * Fallback (200 — not sponsored):
 *   { "sponsored": false, "reason": "...", "remainingTx": 0, "remainingBudget": 0 }
 *
 * Errors (4xx/5xx):
 *   { "error": "...", "code": "VALIDATION_ERROR" }
 */

import { NextResponse } from "next/server";

import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ValidationError } from "@/lib/api/errors";
import { getPaymaster } from "@/lib/paymaster";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (request: Request) => {
  // ── 1. Parse & validate body ───────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Invalid JSON body");
  }

  const { txXdr, walletAddress } = body as Record<string, unknown>;

  if (typeof txXdr !== "string" || txXdr.length === 0) {
    throw new ValidationError("txXdr is required and must be a non-empty string");
  }

  if (typeof walletAddress !== "string" || !walletAddress.startsWith("G") || walletAddress.length !== 56) {
    throw new ValidationError("walletAddress is required and must be a valid Stellar G-address");
  }

  // ── 2. Check sponsorship eligibility & build fee-bump ──────────────
  const paymaster = getPaymaster();
  const result = await paymaster.sponsorTransaction(txXdr, walletAddress);

  return NextResponse.json(result);
});
