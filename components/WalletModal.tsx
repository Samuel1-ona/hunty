"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, Loader2 } from "lucide-react";
import type { WalletProvider } from "@/lib/walletAdapter";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pass the `connect` function from useWallet() */
  onConnect: (provider: WalletProvider) => Promise<{ error?: string }>;
}

export function WalletModal({ isOpen, onClose, onConnect }: WalletModalProps) {
  const [connecting, setConnecting] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<WalletProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (provider: WalletProvider) => {
    setConnecting(true);
    setConnectingProvider(provider);
    setError(null);

    const result = await onConnect(provider);

    if (result.error) {
      setError(result.error);
      setConnecting(false);
      setConnectingProvider(null);
      return;
    }

    // Success — close modal, state is managed by useWallet in parent
    handleClose();
  };

  const handleClose = () => {
    setConnecting(false);
    setConnectingProvider(null);
    setError(null);
    onClose();
  };

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
            aria-label="Close wallet modal"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Choose a Stellar wallet provider to connect to Hunty.
        </DialogDescription>

        <div className="space-y-4 py-2">
          <Button
            onClick={() => handleConnect("freighter")}
            disabled={connecting}
            className="w-full bg-slate-800 dark:bg-slate-900 hover:bg-slate-700 dark:hover:bg-slate-800 disabled:opacity-50 text-white p-4 rounded-xl flex items-center gap-3 justify-start h-auto border border-white/5"
          >
            <span className="text-2xl">🚀</span>
            <div className="text-left flex-1">
              <div className="font-semibold text-base">Freighter</div>
              <div className="text-xs opacity-75">
                Stellar browser extension
              </div>
            </div>
            {connecting && connectingProvider === "freighter" && (
              <Loader2 className="h-4 w-4 animate-spin ml-auto shrink-0" />
            )}
          </Button>
          <Button
            onClick={() => handleConnect("albedo")}
            disabled={connecting}
            className="w-full bg-indigo-700 dark:bg-indigo-900 hover:bg-indigo-600 dark:hover:bg-indigo-800 disabled:opacity-50 text-white p-4 rounded-xl flex items-center gap-3 justify-start h-auto border border-white/5"
          >
            <span className="text-2xl">✨</span>
            <div className="text-left flex-1">
              <div className="font-semibold text-base">Albedo</div>
              <div className="text-xs opacity-75">
                Stellar delegated signer
              </div>
            </div>
            {connecting && connectingProvider === "albedo" && (
              <Loader2 className="h-4 w-4 animate-spin ml-auto shrink-0" />
            )}
          </Button>
          <Button
            onClick={() => handleConnect("rabet")}
            disabled={connecting}
            className="w-full bg-emerald-700 dark:bg-emerald-900 hover:bg-emerald-600 dark:hover:bg-emerald-800 disabled:opacity-50 text-white p-4 rounded-xl flex items-center gap-3 justify-start h-auto border border-white/5"
          >
            <span className="text-2xl">🟢</span>
            <div className="text-left flex-1">
              <div className="font-semibold text-base">Rabet</div>
              <div className="text-xs opacity-75">
                Stellar browser extension
              </div>
            </div>
            {connecting && connectingProvider === "rabet" && (
              <Loader2 className="h-4 w-4 animate-spin ml-auto shrink-0" />
            )}
          </Button>

          {/* Waiting hint */}
          {connecting && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Approve the connection request in your wallet…
            </p>
          )}

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">
              {error}
              {error.includes("not found") && (
                <a
                  href="https://freighter.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-1 underline font-medium hover:text-red-900"
                >
                  Install Freighter →
                </a>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
