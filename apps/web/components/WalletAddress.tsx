'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { WalletIdenticon } from '@/components/WalletIdenticon';
import { getStellarAccountExplorerUrl, truncateAddress } from '@/lib/walletAddress';

const COPIED_RESET_MS = 2000;

interface WalletAddressProps {
  /** Full Stellar address. Nothing renders when this is empty. */
  address: string;
  /** Characters kept at the start of the truncated form. Default 4. */
  lead?: number;
  /** Characters kept at the end of the truncated form. Default 4. */
  tail?: number;
  /** Show the derived avatar. Default true. */
  showIdenticon?: boolean;
  /** Avatar size in pixels. Default 24. */
  identiconSize?: number;
  /** Show the copy button. Default true. */
  showCopyButton?: boolean;
  /** Show the stellar.expert link. Default true. */
  showExplorerLink?: boolean;
  /** Wrapper classes. */
  className?: string;
  /** Classes for the address text itself, for callers that need a different size. */
  addressClassName?: string;
}

/**
 * Connected-wallet address with the three affordances users expect next to it:
 * a derived avatar, one-click copy, and a link out to stellar.expert.
 *
 * Used by the header, the profile page, and the leaderboard so all three stay
 * in sync — including the truncation format.
 */
export function WalletAddress({
  address,
  lead = 4,
  tail = 4,
  showIdenticon = true,
  identiconSize = 24,
  showCopyButton = true,
  showExplorerLink = true,
  className,
  addressClassName,
}: WalletAddressProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The "Copied!" tick outlives the click, so it has to be cancelled if the
  // component unmounts first — leaderboard rows come and go on every refresh.
  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);

      setCopied(true);
      toast.success('Wallet address copied');

      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      // Clipboard access is refused on insecure origins and in some in-app
      // browsers. Tell the user rather than silently doing nothing.
      toast.error("Couldn't copy the address. Select and copy it manually.");
    }
  }, [address]);

  if (!address) return null;

  const truncated = truncateAddress(address, { lead, tail });

  return (
    <span className={cn('inline-flex items-center gap-2 min-w-0', className)}>
      {showIdenticon && (
        <WalletIdenticon address={address} size={identiconSize} className="flex-shrink-0" />
      )}

      <span
        title={address}
        className={cn('font-mono text-sm truncate', addressClassName)}
        data-testid="wallet-address-text"
      >
        {truncated}
      </span>

      {showCopyButton && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy wallet address"
          className="flex-shrink-0 p-1 rounded-md text-slate-400 hover:text-[#3737A4] dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" aria-hidden="true" />
          ) : (
            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </button>
      )}

      {showExplorerLink && (
        <a
          href={getStellarAccountExplorerUrl(address)}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="View wallet address on Stellar explorer"
          className="flex-shrink-0 p-1 rounded-md text-slate-400 hover:text-[#3737A4] dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      )}
    </span>
  );
}
