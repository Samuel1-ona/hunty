'use client';

import { useState } from 'react';
import { X, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { WalletProvider } from '@/lib/wallets/types';
import { useWalletStore } from '@/lib/wallets/walletStore';

// ── Wallet registry ──────────────────────────────────────────────────────────

interface WalletOption {
  id: WalletProvider;
  name: string;
  description: string;
  icon: string;
  color: string;
  installUrl: string;
}

const WALLET_OPTIONS: WalletOption[] = [
  {
    id: 'freighter',
    name: 'Freighter',
    description: 'Official Stellar browser extension by SDF',
    icon: '🚀',
    color: 'from-slate-700 to-slate-900',
    installUrl: 'https://freighter.app',
  },
  {
    id: 'albedo',
    name: 'Albedo',
    description: 'Delegated Stellar signer — no install required',
    icon: '✨',
    color: 'from-indigo-600 to-violet-700',
    installUrl: 'https://albedo.link',
  },
  {
    id: 'xbull',
    name: 'xBull Wallet',
    description: 'Feature-rich Stellar wallet for power users',
    icon: '🐂',
    color: 'from-orange-500 to-red-600',
    installUrl: 'https://xbull.app',
  },
];

// ── Component ────────────────────────────────────────────────────────────────

interface WalletSelectionModalProps {
  /** Controls whether the modal is shown */
  isOpen: boolean;
  /** Called when the user dismisses the modal */
  onClose: () => void;
  /**
   * Called when the user picks a provider.
   * Should trigger the actual wallet connection and return an error string on
   * failure, or an empty object on success.
   */
  onConnect: (provider: WalletProvider) => Promise<{ error?: string }>;
}

export function WalletSelectionModal({ isOpen, onClose, onConnect }: WalletSelectionModalProps) {
  const lastUsedProvider = useWalletStore((s) => s.lastUsedProvider);
  const [connectingProvider, setConnectingProvider] = useState<WalletProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sort: last-used wallet appears first
  const sorted = [...WALLET_OPTIONS].sort((a, b) => {
    if (a.id === lastUsedProvider) return -1;
    if (b.id === lastUsedProvider) return 1;
    return 0;
  });

  const handleConnect = async (provider: WalletProvider) => {
    setConnectingProvider(provider);
    setError(null);

    const result = await onConnect(provider);

    if (result.error) {
      setError(result.error);
      setConnectingProvider(null);
      return;
    }

    // Success — parent updates wallet state; close modal
    handleClose();
  };

  const handleClose = () => {
    setConnectingProvider(null);
    setError(null);
    onClose();
  };

  const isConnecting = connectingProvider !== null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-slate-800 dark:text-slate-100 font-semibold">
            Connect a wallet
          </DialogTitle>
          <DialogClose
            onClick={handleClose}
            className="h-6 w-6 rounded-full bg-pink-500 hover:bg-pink-600 text-white inline-flex items-center justify-center"
            aria-label="Close wallet selection"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        </DialogHeader>

        <DialogDescription className="sr-only">
          Choose a Stellar wallet provider to connect to Hunty.
        </DialogDescription>

        <div className="space-y-3 py-2">
          {sorted.map((wallet) => (
            <WalletButton
              key={wallet.id}
              wallet={wallet}
              isLastUsed={wallet.id === lastUsedProvider}
              isConnecting={isConnecting}
              isThisConnecting={connectingProvider === wallet.id}
              onClick={() => handleConnect(wallet.id)}
            />
          ))}

          {isConnecting && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 pt-1">
              Approve the connection request in your wallet…
            </p>
          )}

          {error && (
            <ErrorBanner error={error} provider={connectingProvider} wallets={WALLET_OPTIONS} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function WalletButton({
  wallet,
  isLastUsed,
  isConnecting,
  isThisConnecting,
  onClick,
}: {
  wallet: WalletOption;
  isLastUsed: boolean;
  isConnecting: boolean;
  isThisConnecting: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={isConnecting}
      className={`
        w-full bg-gradient-to-r ${wallet.color}
        hover:opacity-90 disabled:opacity-50
        text-white p-4 rounded-xl flex items-center gap-3 justify-start h-auto
        border border-white/10 relative
      `}
      aria-label={`Connect with ${wallet.name}`}
    >
      <span className="text-2xl shrink-0" aria-hidden="true">
        {wallet.icon}
      </span>
      <div className="text-left flex-1 min-w-0">
        <div className="font-semibold text-base flex items-center gap-2">
          {wallet.name}
          {isLastUsed && (
            <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">
              Last used
            </span>
          )}
        </div>
        <div className="text-xs opacity-75 truncate">{wallet.description}</div>
      </div>
      {isThisConnecting && (
        <Loader2 className="h-4 w-4 animate-spin ml-auto shrink-0" aria-hidden="true" />
      )}
    </Button>
  );
}

function ErrorBanner({
  error,
  provider,
  wallets,
}: {
  error: string;
  provider: WalletProvider | null;
  wallets: WalletOption[];
}) {
  const wallet = wallets.find((w) => w.id === provider);
  const showInstallLink = error.toLowerCase().includes('not found') && wallet;

  return (
    <div
      role="alert"
      className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 p-3 text-sm text-red-700 dark:text-red-400"
    >
      <p>{error}</p>
      {showInstallLink && (
        <a
          href={wallet.installUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 underline font-medium hover:text-red-900"
        >
          Install {wallet.name}
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
