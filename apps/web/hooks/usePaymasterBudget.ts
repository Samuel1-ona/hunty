"use client";

import { useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { WalletContext } from "@/lib/context/WalletContext";
import { fetchPaymasterBudget, PaymasterBudgetError } from "@/lib/paymaster/client";
import { queryCachePolicy, queryKeys } from "@/lib/queryKeys";
import type { BudgetInfo } from "@/lib/paymaster/types";

/** A bad address is not worth retrying; anything else transient is. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof PaymasterBudgetError && error.kind === "invalid-address") return false;
  return failureCount < 2;
}

export type PaymasterBudgetState = {
  /** Address this budget belongs to, or `""` when no wallet is connected. */
  address: string;
  /** Sponsored transactions used so far; `null` until the first successful read. */
  usedTx: number | null;
  /** Maximum sponsored transactions allowed; `null` until the first successful read. */
  maxTx: number | null;
  /** Sponsored fees consumed so far, in stroops; `null` until the first successful read. */
  usedBudget: number | null;
  /** Maximum sponsored budget, in stroops; `null` until the first successful read. */
  maxBudget: number | null;
  /**
   * Whether the next sponsorable action would be covered by the paymaster.
   * Defaults to `false` while loading or on error — an unconfirmed sponsorship
   * must never be presented as guaranteed.
   */
  isSponsored: boolean;
  /** Sponsored transactions remaining, or `null` when unknown. */
  remainingTx: number | null;
  /** Sponsored budget remaining (stroops), or `null` when unknown. */
  remainingBudget: number | null;
  /** The budget has not loaded yet and no wallet-connection state prevents it. */
  isLoading: boolean;
  /** User-facing failure message, or `null` when the last read succeeded. */
  error: string | null;
  /** Forces an immediate refetch. */
  refresh: () => void;
};

/**
 * Sponsorship coverage for the connected wallet's next action.
 *
 * Reads the connected address from `WalletContext` by default so it can be
 * dropped in anywhere without plumbing, but accepts an explicit `address`
 * override for contexts that already have one (e.g. a review step for a
 * specific wallet).
 *
 * Any failure to reach the paymaster budget endpoint is treated as "not
 * sponsored" rather than surfaced as a blocking error — the underlying
 * transaction still works with a user-paid fee, so the indicator degrades to
 * the safe assumption instead of leaving the player unsure.
 */
export function usePaymasterBudget(options: { address?: string } = {}): PaymasterBudgetState {
  const wallet = useContext(WalletContext);
  const contextAddress = wallet?.connected ? wallet.publicKey : "";
  const address = options.address ?? contextAddress ?? "";
  const enabled = address.length > 0;

  const budgetKey = useMemo(() => queryKeys.paymaster.budget(address), [address]);

  const query = useQuery<BudgetInfo>({
    queryKey: budgetKey,
    queryFn: ({ signal }) => fetchPaymasterBudget(address, { signal }),
    enabled,
    staleTime: queryCachePolicy.paymasterBudget.staleTime,
    gcTime: queryCachePolicy.paymasterBudget.gcTime,
    refetchInterval: queryCachePolicy.paymasterBudget.refetchInterval,
    refetchIntervalInBackground: false,
    retry: shouldRetry,
  });

  const data = query.data;
  const hasData = data != null;

  return {
    address,
    usedTx: data?.usedTx ?? null,
    maxTx: data?.maxTx ?? null,
    usedBudget: data?.usedBudget ?? null,
    maxBudget: data?.maxBudget ?? null,
    isSponsored: data?.eligible ?? false,
    remainingTx: data ? Math.max(0, data.maxTx - data.usedTx) : null,
    remainingBudget: data ? Math.max(0, data.maxBudget - data.usedBudget) : null,
    isLoading: enabled && !hasData && !query.error,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: () => void query.refetch(),
  };
}
