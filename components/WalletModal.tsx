"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, Loader2 } from "lucide-react";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pass the `connect` function from useFreighterWallet() */
  onConnect: () => Promise<{ error?: string }>;
}

export function WalletModal({ isOpen, onClose, onConnect }: WalletModalProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    const result = await onConnect();

    if (result.error) {
      setError(result.error);
      setConnecting(false);
      return;
    }

    // Success — close modal, state is managed by useFreighterWallet in parent
    handleClose();
  };

  const handleClose = () => {
    setConnecting(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-slate-800 font-semibold">
            Connect a wallet
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-6 w-6 rounded-full bg-pink-500 hover:bg-pink-600 text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Freighter wallet option */}
          <Button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white p-4 rounded-xl flex items-center gap-3 justify-start h-auto"
          >
            <span className="text-2xl">🚀</span>
            <div className="text-left flex-1">
              <div className="font-semibold text-base">Freighter</div>
              <div className="text-xs opacity-75">
                Stellar browser extension
              </div>
            </div>
            {connecting && (
              <Loader2 className="h-4 w-4 animate-spin ml-auto shrink-0" />
            )}
          </Button>

          {/* Waiting hint */}
          {connecting && (
            <p className="text-center text-sm text-slate-500">
              Approve the connection in your Freighter extension…
            </p>
          )}

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
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
