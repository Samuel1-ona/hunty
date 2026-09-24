/**
 * Client-safe access to the paymaster budget endpoint.
 *
 * This module must never import `@/lib/paymaster` (the server-side
 * `StellarPaymaster` class) — that module reads `PAYMASTER_SECRET` and pulls
 * in `@stellar/stellar-sdk` signing code that has no business in the browser
 * bundle. Only the plain `BudgetInfo` type (safe, data-only) is shared.
 */

import type { BudgetInfo } from "@/lib/paymaster/types";

export type PaymasterBudgetErrorKind = "invalid-address" | "network" | "http" | "parse";

export class PaymasterBudgetError extends Error {
  readonly kind: PaymasterBudgetErrorKind;
  readonly status?: number;

  constructor(kind: PaymasterBudgetErrorKind, message: string, status?: number) {
    super(message);
    this.name = "PaymasterBudgetError";
    this.kind = kind;
    this.status = status;
  }
}

const STELLAR_PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;

/**
 * Fetch sponsorship budget/eligibility for a wallet from
 * `GET /api/paymaster/budget/[wallet]`.
 */
export async function fetchPaymasterBudget(
  address: string,
  init?: { signal?: AbortSignal },
): Promise<BudgetInfo> {
  if (!STELLAR_PUBLIC_KEY_PATTERN.test(address)) {
    throw new PaymasterBudgetError("invalid-address", "Invalid Stellar wallet address.");
  }

  let response: Response;
  try {
    response = await fetch(`/api/paymaster/budget/${encodeURIComponent(address)}`, {
      signal: init?.signal,
    });
  } catch (err) {
    throw new PaymasterBudgetError(
      "network",
      err instanceof Error ? err.message : "Network request failed.",
    );
  }

  if (!response.ok) {
    throw new PaymasterBudgetError(
      "http",
      `Paymaster budget request failed with status ${response.status}.`,
      response.status,
    );
  }

  try {
    return (await response.json()) as BudgetInfo;
  } catch (err) {
    throw new PaymasterBudgetError(
      "parse",
      err instanceof Error ? err.message : "Failed to parse paymaster budget response.",
    );
  }
}
