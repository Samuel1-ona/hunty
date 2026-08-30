'use client';

import { Fuel, Wallet, Zap } from 'lucide-react';

import { usePaymasterBudget } from '@/hooks/usePaymasterBudget';
import { cn } from '@/lib/utils';
import { formatXlmAmount } from '@/lib/wallet/balance';

/** 1 XLM = 10_000_000 stroops. */
const STROOPS_PER_XLM = 10_000_000;

/** Surface the remaining count once the player is down to a handful of sponsored actions. */
const LOW_REMAINING_TX_THRESHOLD = 1;

/** Also surface it once less than this fraction of the sponsored budget is left. */
const LOW_REMAINING_BUDGET_RATIO = 0.2;

type GasSponsorshipIndicatorProps = {
  className?: string;
};

/**
 * Tells the player whether their next on-chain action will be covered by the
 * paymaster, before they attempt it.
 *
 * States:
 *   no wallet    → render nothing, there is no "next action" to describe yet
 *   loading      → skeleton, no claim made either way
 *   sponsored    → "Sponsored" badge, with remaining count once it is low
 *   not eligible → "You'll pay network fees" fallback, never blocks the action
 *   fetch failed → same fallback as "not eligible" — an unconfirmed budget is
 *                  never presented as a guaranteed sponsorship
 */
export function GasSponsorshipIndicator({ className }: GasSponsorshipIndicatorProps) {
  const { address, isSponsored, remainingTx, remainingBudget, maxBudget, isLoading } =
    usePaymasterBudget();

  if (!address) return null;

  const rootClass = cn(
    'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
    className
  );

  if (isLoading) {
    return (
      <div
        className={cn(rootClass, 'bg-slate-100 dark:bg-slate-800')}
        role="status"
        aria-label="Checking gas sponsorship status"
      >
        <span className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <span className="sr-only">Checking sponsorship…</span>
      </div>
    );
  }

  if (!isSponsored) {
    return (
      <div
        className={cn(
          rootClass,
          'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        )}
        role="status"
        aria-label="Your next action will not be sponsored — you'll pay the network fee"
        data-testid="gas-sponsorship-indicator"
        data-sponsored="false"
      >
        <Wallet className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        <span>You&apos;ll pay network fees</span>
      </div>
    );
  }

  const budgetIsLow =
    remainingBudget != null &&
    maxBudget != null &&
    maxBudget > 0 &&
    remainingBudget / maxBudget <= LOW_REMAINING_BUDGET_RATIO;
  const showRemaining =
    (remainingTx != null && remainingTx <= LOW_REMAINING_TX_THRESHOLD) || budgetIsLow;
  const remainingXlm =
    remainingBudget != null ? formatXlmAmount(remainingBudget / STROOPS_PER_XLM) : null;

  const label = showRemaining
    ? `Your next action is sponsored — ${remainingTx} sponsored transaction${remainingTx === 1 ? '' : 's'} left, ${remainingXlm} XLM budget remaining`
    : 'Your next action is sponsored — network fees are covered';

  return (
    <div
      className={cn(
        rootClass,
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      )}
      role="status"
      aria-label={label}
      data-testid="gas-sponsorship-indicator"
      data-sponsored="true"
    >
      <Zap className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
      <span>Sponsored</span>
      {showRemaining && (
        <>
          <span aria-hidden="true" className="h-3 w-px bg-emerald-300 dark:bg-emerald-700" />
          <span className="flex items-center gap-1" title={`${remainingXlm} XLM budget remaining`}>
            <Fuel className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            {remainingTx} left
          </span>
        </>
      )}
    </div>
  );
}
