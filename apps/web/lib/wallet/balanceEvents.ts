/**
 * A tiny pub/sub bridging blockchain writes to the wallet balance UI.
 *
 * Transaction code (`lib/contracts/*`, `lib/txToast.ts`) lives outside the
 * React tree and has no access to the react-query client, so it cannot update
 * cached balances directly. Instead it emits events here; `useWalletBalance`
 * subscribes and translates them into cache writes:
 *
 *   predictWalletBalanceChange({ xlmDelta: -5 })  → optimistic UI, applied now
 *   settleWalletBalance()                         → refetch the on-chain truth
 *
 * Keeping this a module-level emitter (rather than context) means a transaction
 * helper can report a balance change from anywhere without threading props or
 * hooks through the call site.
 */

import { logger } from '@/lib/logger';

export type WalletBalanceDelta = {
  /** Signed change in XLM to apply immediately, e.g. `-2.5` for a 2.5 XLM spend. */
  xlmDelta?: number;
  /** Signed change in owned NFT count, e.g. `+1` after a successful mint. */
  nftDelta?: number;
};

export type WalletBalanceEvent =
  | ({ type: 'optimistic' } & WalletBalanceDelta)
  | { type: 'settled' };

export type WalletBalanceEventListener = (event: WalletBalanceEvent) => void;

const listeners = new Set<WalletBalanceEventListener>();

function emit(event: WalletBalanceEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      // One misbehaving subscriber must not stop the others from updating, and
      // must never propagate back into the transaction that triggered it.
      logger.error('Wallet balance listener threw:', error);
    }
  }
}

/** Subscribes to balance events. Returns an unsubscribe function. */
export function subscribeToWalletBalanceEvents(listener: WalletBalanceEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Announces an expected balance change so the UI can update before the
 * transaction confirms. Always pair with {@link settleWalletBalance} (directly
 * or via `withTransactionToast`) so the prediction is reconciled against chain
 * state — subscribers also self-reconcile on a timer as a safety net.
 */
export function predictWalletBalanceChange(delta: WalletBalanceDelta): void {
  const { xlmDelta = 0, nftDelta = 0 } = delta;
  if (xlmDelta === 0 && nftDelta === 0) return;
  emit({ type: 'optimistic', xlmDelta, nftDelta });
}

/**
 * Announces that a transaction has settled (confirmed or failed) and cached
 * balances should be refetched. Safe to call when no prediction was made — it
 * simply pulls a fresh balance ahead of the next poll tick.
 */
export function settleWalletBalance(): void {
  emit({ type: 'settled' });
}

/** Test helper — drops every subscriber. Not used by application code. */
export function resetWalletBalanceListeners(): void {
  listeners.clear();
}
