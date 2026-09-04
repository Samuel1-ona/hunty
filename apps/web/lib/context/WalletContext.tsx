"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { useIsMounted } from "@/hooks/useIsMounted"
import { migrateGuestProgressToWallet } from "@/lib/huntStore"
import {
  clearStoredWalletSession,
  connectWalletProvider,
  getStoredWalletSession,
  setStoredWalletSession,
  type WalletProvider,
} from "@/lib/walletAdapter"
import { useWalletStore } from "@/lib/wallets/walletStore"
import { truncateAddress } from "@/lib/walletAddress"
import { truncateAddress } from "@/lib/walletAddress";
import { useWalletMachine } from "@/lib/wallet/walletMachine";
import { useWalletStore } from "@/lib/wallets/walletStore";
import { usePlayerStore, useWalletStore as useLegacyWalletStore } from "@/store/useStore";
import type { WalletProvider } from "@/lib/wallets/types";

// ─── Address display helper ────────────────────────────────────────────────

/**
 * Shortens a Stellar public key for display.
 * e.g. GABCDE...UVWXYZ (Stellar keys are 56 chars starting with G)
 *
 * Thin wrapper over the shared helper, kept because it is imported in several
 * places and because the header's symmetric 6 + 6 split differs from the
 * 4 + 4 default used elsewhere.
 */
export function shortenAddress(address: string, chars = 6): string {
  if (!address) return address;
  return truncateAddress(address, { lead: chars, tail: chars });
}

// ─── Context value type ────────────────────────────────────────────────────

interface WalletContextValue {
  /** Whether a wallet is currently connected */
  connected: boolean;
  /** Full Stellar public key of connected account, or empty string */
  publicKey: string;
  /** Shortened public key suitable for display in header */
  displayKey: string;
  /** Call this when the user clicks "Connect Wallet" — triggers wallet popup */
  connect: (provider?: WalletProvider) => Promise<{ error?: string }>;
  /** Current selected wallet provider. */
  walletProvider: WalletProvider | null;
  /** Disconnects, clears all wallet/session state, and redirects home */
  disconnect: () => void;
}

export const WalletContext = createContext<WalletContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const serverSafe = useRef(typeof window !== "undefined");

  // ── State machine (single source of truth) ─────────────────────────
  const {
    state,
    connect: machineConnect,
    disconnect: machineDisconnect,
  } = useWalletMachine();

  const { status, publicKey, provider, error } = state;
  const connected = status === "connected";

  // ── Sync machine state into zustand store (cross-component) ────────
  const { syncFromMachine: storeSync } = useWalletStore();

  useEffect(() => {
    if (!serverSafe.current) return;
    storeSync({ status, publicKey, provider, error });

    // Also sync legacy stores for backwards compat
    if (status === "connected") {
      useLegacyWalletStore.getState().setWallet(publicKey);
    }
    if (status === "disconnected") {
      useLegacyWalletStore.getState().clearWallet();
      usePlayerStore.getState().clearProgress();
    }
  }, [mounted])

  /**
   * Trigger wallet popup to request wallet access.
   * requestAccess() prompts if not yet on the allow list,
   * or returns immediately if the user already approved this app.
   */
  const connect = useCallback(async (provider: WalletProvider = "freighter"): Promise<{ error?: string }> => {
    try {
      if (provider === "freighter") {
        const connResult = await isConnected()
        if (!connResult.isConnected) {
          return {
            error:
              "Freighter extension not found. Please install it from freighter.app",
          }
        }

        // requestAccess() returns { address: string, error?: string }
        // error is a plain string per the Freighter API docs
        const accessResult = await requestAccess()

        if (accessResult.error) {
          return { error: String(accessResult.error) }
        }

        const address = accessResult.address
        if (!address) {
          return { error: "No public key returned. Please try again." }
        }

        setStoredWalletSession("freighter", address)
        localStorage.setItem(STORAGE_KEY, address)
        migrateGuestProgressToWallet(address)
        setPublicKey(address)
        setWalletProvider("freighter")
        setConnected(true)
        storeSetConnected(address, "freighter")
        return {}
      }

      const address = await connectWalletProvider(provider)
      setStoredWalletSession(provider, address)
      localStorage.setItem(STORAGE_KEY, address)
      migrateGuestProgressToWallet(address)
      setPublicKey(address)
      setWalletProvider(provider)
      setConnected(true)
      storeSetConnected(address, provider)
      return {}
    } catch (err) {
      return {
        error:
          err instanceof Error
            ? err.message
            : "Unexpected error during connection.",
      }
    }
  }, [storeSetConnected])

  // ── Connect wrapper (matches existing interface) ───────────────────
  // machineConnect handles all errors internally by dispatching CONNECT_ERROR.
  const connect = useCallback(
    async (provider?: WalletProvider): Promise<{ error?: string }> => {
      await machineConnect(provider);
      return {};
    },
    [machineConnect]
  );

  // ── Disconnect wrapper ────────────────────────────────────────────
  const disconnect = useCallback(() => {
    machineDisconnect();
    router.push("/");
  }, [machineDisconnect, router]);

  // ── Memoized context value ─────────────────────────────────────────
  const value = useMemo<WalletContextValue>(
    () => ({
      connected,
      publicKey,
      displayKey: shortenAddress(publicKey),
      connect,
      walletProvider: provider,
      disconnect,
    }),
    [connected, publicKey, connect, provider, disconnect]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Hook to access wallet connection state and methods.
 * Must be used within a WalletProvider.
 */
export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (ctx == null) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}
