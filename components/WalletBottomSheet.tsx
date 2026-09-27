"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  X,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WalletProvider } from "@/lib/walletAdapter";

interface WalletBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (provider: WalletProvider) => Promise<{ error?: string }>;
}

export function WalletBottomSheet({
  isOpen,
  onClose,
  onConnect,
}: WalletBottomSheetProps) {
  const [connectingProvider, setConnectingProvider] =
    useState<WalletProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEducation, setShowEducation] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleConnect = async (provider: WalletProvider) => {
    setConnectingProvider(provider);
    setError(null);
    try {
      const result = await onConnect(provider);
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnectingProvider(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={
              prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }
            }
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={prefersReducedMotion ? false : { y: "100%" }}
            animate={{ y: 0 }}
            exit={prefersReducedMotion ? { y: "100%" } : { y: "100%" }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring", damping: 25, stiffness: 200 }
            }
            className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[90vh] flex-col rounded-t-[2.5rem] bg-white p-6 shadow-2xl dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800"
          >
            {/* Handle */}
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />

            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Connect Wallet
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Select your preferred Stellar wallet
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close wallet options"
                className="rounded-full bg-slate-100 dark:bg-slate-800 h-10 w-10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4 overflow-y-auto pb-8">
              {/* xBull Wallet */}
              <button
                onClick={() => handleConnect("xbull")}
                disabled={!!connectingProvider}
                aria-label="Connect xBull wallet"
                className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 p-[1px] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-[calc(1rem-1px)]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600">
                    <span className="text-2xl font-bold">🐂</span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                      xBull Wallet
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Perfect for power users & mobile
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-orange-500 transition-colors" />
                </div>
              </button>

              {/* Lobstr Wallet */}
              <button
                onClick={() => handleConnect("lobstr")}
                disabled={!!connectingProvider}
                aria-label="Connect Lobstr wallet"
                className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 p-[1px] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-[calc(1rem-1px)]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                    <span className="text-2xl font-bold">🦞</span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                      Lobstr
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      The most popular Stellar wallet
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </button>

              {/* Error Display */}
              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-4 text-sm text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                  <div className="flex gap-2">
                    <X className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                  {error.includes("not found") && (
                    <div className="mt-2 flex gap-3">
                      <a
                        href="https://xbull.app"
                        target="_blank"
                        className="underline font-medium decoration-red-200"
                      >
                        Get xBull
                      </a>
                      <a
                        href="https://lobstr.co"
                        target="_blank"
                        className="underline font-medium decoration-red-200"
                      >
                        Get Lobstr
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Educational Section */}
              <div className="mt-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 p-6 border border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowEducation(!showEducation)}
                  aria-label={
                    showEducation
                      ? "Hide wallet education"
                      : "Show wallet education"
                  }
                  className="flex w-full items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 text-indigo-500" />
                    <span className="font-semibold text-slate-900 dark:text-white">
                      New to Web3?
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-slate-400 transition-transform",
                      showEducation && "rotate-180",
                    )}
                  />
                </button>

                <AnimatePresence>
                  {showEducation && (
                    <motion.div
                      initial={
                        prefersReducedMotion ? false : { height: 0, opacity: 0 }
                      }
                      animate={
                        prefersReducedMotion
                          ? {}
                          : { height: "auto", opacity: 1 }
                      }
                      exit={
                        prefersReducedMotion ? {} : { height: 0, opacity: 0 }
                      }
                      transition={
                        prefersReducedMotion ? { duration: 0 } : undefined
                      }
                      className="overflow-hidden"
                    >
                      <div className="pt-6 space-y-6">
                        <div className="space-y-4">
                          <div className="flex gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600">
                              <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white">
                                Why a wallet?
                              </h4>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Hunty is decentralized. We don&apos;t store your
                                keys or access your funds. Wallets act as your
                                digital ID and vault.
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                              <Smartphone className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white">
                                The Process
                              </h4>
                              <div className="mt-2 text-sm text-slate-500 dark:text-slate-400 space-y-2">
                                <div className="flex gap-2">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    1.
                                  </span>
                                  <span>
                                    Install xBull or Lobstr from the App Store.
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    2.
                                  </span>
                                  <span>
                                    Create an account and save your Secret
                                    Phrase safely.
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    3.
                                  </span>
                                  <span>
                                    Come back here and tap &ldquo;Connect&rdquo;
                                    to link your account.
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/30">
                          <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                            <strong>Safe & Secure:</strong> Your private keys
                            never leave your device. You only authorize specific
                            actions like joining a hunt.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {connectingProvider && (
              <div className="absolute inset-x-0 bottom-0 top-[88px] flex items-center justify-center bg-white/50 backdrop-blur-[2px] dark:bg-slate-900/50 rounded-t-[2.5rem]">
                <div className="flex flex-col items-center gap-4">
                  <motion.div
                    animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { repeat: Infinity, duration: 1, ease: "linear" }
                    }
                    className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full"
                  />
                  <p className="font-medium text-slate-900 dark:text-white italic">
                    Approving connection in {connectingProvider}...
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
