/**
 * Global Zustand store for Hunty.
 *
 * Replaces prop drilling for wallet state and current player progress.
 *
 * Usage:
 *   const { walletAddress, walletBalance, isConnected } = useWalletStore()
 *   const { currentProgress, setProgress } = usePlayerStore()
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlayerProgress } from "@/lib/types";

// ─── Wallet Store ─────────────────────────────────────────────────────────────

interface WalletState {
  /** Full Stellar public key of the connected account, or empty string */
  walletAddress: string;
  /** XLM balance as a formatted string (e.g. "42.5000000"), or null if not yet fetched */
  walletBalance: string | null;
  /** Whether a wallet is currently connected */
  isConnected: boolean;

  // Actions
  setWallet: (address: string) => void;
  setBalance: (balance: string | null) => void;
  clearWallet: () => void;
}

/**
 * Wallet store — persisted to localStorage so the session survives page refreshes.
 *
 * Sync this store whenever useFreighterWallet fires connect / disconnect,
 * or call setWallet / clearWallet directly.
 */
export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      walletAddress: "",
      walletBalance: null,
      isConnected: false,

      setWallet: (address) =>
        set({ walletAddress: address, isConnected: Boolean(address) }),

      setBalance: (balance) => set({ walletBalance: balance }),

      clearWallet: () =>
        set({ walletAddress: "", walletBalance: null, isConnected: false }),
    }),
    {
      name: "hunty-wallet",
      // Only persist the address — balance is fetched on demand
      partialize: (state) => ({ walletAddress: state.walletAddress }),
      // Re-hydrate isConnected after restoring the address
      onRehydrateStorage: () => (state) => {
        if (state?.walletAddress) {
          state.isConnected = true;
        }
      },
    },
  ),
);

// ─── Player Progress Store ────────────────────────────────────────────────────

interface PlayerState {
  /** Progress for the hunt the player is currently active in, or null */
  currentProgress: PlayerProgress | null;

  // Actions
  setProgress: (progress: PlayerProgress) => void;
  updateClueIndex: (index: number) => void;
  markCompleted: () => void;
  clearProgress: () => void;
}

/**
 * Player progress store — tracks the active hunt session in memory.
 *
 * Set currentProgress when a player registers or resumes a hunt.
 * Clear it when the hunt ends or the player navigates away.
 */
export const usePlayerStore = create<PlayerState>()((set) => ({
  currentProgress: null,

  setProgress: (progress) => set({ currentProgress: progress }),

  updateClueIndex: (index) =>
    set((state) =>
      state.currentProgress
        ? { currentProgress: { ...state.currentProgress, current_clue_index: index } }
        : state,
    ),

  markCompleted: () =>
    set((state) =>
      state.currentProgress
        ? { currentProgress: { ...state.currentProgress, completed: true } }
        : state,
    ),

  clearProgress: () => set({ currentProgress: null }),
}));
