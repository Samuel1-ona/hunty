'use client';

import { AlertTriangle, RefreshCw, Trophy } from 'lucide-react';
import Coin from './icons/Coin';
import { cn } from '@/lib/utils';
import { formatXlmAmount } from '@/lib/wallet/balance';
import { useWalletBalance } from '@/hooks/useWalletBalance';

type WalletBalanceProps = {
  /** `pill` for the desktop header chip, `row` for menu and profile layouts. */
  variant?: 'pill' | 'row';
  /** Forwarded to the root element — the onboarding tour anchors to `#balance-pill`. */
  id?: string;
  className?: string;
  /**
   * Also list non-native token holdings beneath the XLM line. Off by default —
   * the header chip has no room for it; the profile card does.
   */
  showTokens?: boolean;
};

/**
 * Live XLM balance and NFT count for the connected wallet.
 *
 * Every state the underlying poll can be in is represented, because a balance
 * that silently shows a stale or zero value is worse than one that admits it
 * does not know:
 *
 *   loading     → skeleton, no number
 *   ok          → balance + NFT count
 *   optimistic  → same, dimmed, marked as pending confirmation
 *   stale       → last known value plus a warning affordance
 *   failed      → em dash plus a retry control
 */
export function WalletBalance({
  variant = 'pill',
  id,
  className,
  showTokens = false,
}: WalletBalanceProps) {
  const {
    address,
    formattedXlm,
    tokens,
    nftCount,
    unfunded,
    isLoading,
    isOptimistic,
    error,
    isStale,
    canRetry,
    refresh,
  } = useWalletBalance();

  if (!address) return null;

  const isPill = variant === 'pill';
  const rootClass = cn(
    'flex items-center gap-2',
    isPill
      ? 'px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800'
      : 'text-slate-700 dark:text-slate-300',
    className
  );

  if (isLoading) {
    return (
      <div id={id} className={rootClass} role="status" aria-label="Loading wallet balance">
        <span className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <span className="sr-only">Loading wallet balance…</span>
      </div>
    );
  }

  const visibleTokens = showTokens ? tokens : [];

  const statusLabel = canRetry
    ? 'Wallet balance unavailable'
    : `Balance ${formattedXlm} XLM` +
      visibleTokens.map((token) => `, ${token.balance} ${token.assetCode}`).join('') +
      (nftCount == null ? '' : `, ${nftCount} NFT${nftCount === 1 ? '' : 's'}`) +
      (isOptimistic ? ', pending confirmation' : '') +
      (isStale ? ', may be out of date' : '');

  const summaryRow = (
    <>
      <span
        className={cn('flex items-center gap-1.5 transition-opacity', isOptimistic && 'opacity-60')}
      >
        <Coin />
        <span
          className={cn(
            'text-sm font-semibold',
            isPill
              ? 'bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent dark:from-indigo-300 dark:to-indigo-500'
              : 'text-slate-700 dark:text-slate-300'
          )}
          data-testid="wallet-balance-xlm"
        >
          {formattedXlm}
        </span>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">XLM</span>
      </span>

      {nftCount != null && (
        <>
          <span aria-hidden="true" className="h-3 w-px bg-slate-300 dark:bg-slate-600" />
          <span
            className={cn(
              'flex items-center gap-1 transition-opacity',
              isOptimistic && 'opacity-60'
            )}
            title={`${nftCount} NFT${nftCount === 1 ? '' : 's'} owned`}
            data-testid="wallet-balance-nfts"
          >
            <Trophy className="w-3.5 h-3.5 text-[#FFB449]" aria-hidden="true" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {nftCount}
            </span>
          </span>
        </>
      )}

      {unfunded && !error && (
        <span className="text-[11px] text-slate-400 dark:text-slate-500">unfunded</span>
      )}

      {isStale && (
        <span title={error ?? undefined} data-testid="wallet-balance-stale">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" aria-hidden="true" />
        </span>
      )}

      {canRetry && error && (
        <button
          type="button"
          onClick={refresh}
          title={error}
          aria-label={`Retry loading balance. ${error}`}
          className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-[#3737A4] dark:hover:text-indigo-400 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Retry
        </button>
      )}
    </>
  );

  const wrapperProps = {
    id,
    role: 'status' as const,
    'aria-live': 'polite' as const,
    'aria-label': statusLabel,
    'data-testid': 'wallet-balance',
  };

  if (visibleTokens.length === 0) {
    return (
      <div {...wrapperProps} className={rootClass}>
        {summaryRow}
      </div>
    );
  }

  return (
    <div {...wrapperProps} className={cn('flex flex-col gap-1.5', className)}>
      <div
        className={cn(
          'flex items-center gap-2',
          isPill && 'px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800'
        )}
      >
        {summaryRow}
      </div>
      <ul className="flex flex-col gap-0.5" data-testid="wallet-balance-tokens">
        {visibleTokens.map((token) => (
          // Code alone is not unique across issuers, so the key carries both.
          <li
            key={`${token.assetCode}-${token.assetIssuer}`}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="font-medium text-slate-500 dark:text-slate-400">
              {token.assetCode}
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
              {formatXlmAmount(token.balance)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
