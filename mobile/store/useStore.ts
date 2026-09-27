/**
 * Global Zustand store for Hunty Mobile.
 *
 * Replaces prop drilling for wallet state and current player progress.
 *
 * Usage:
 *   const { walletAddress, walletBalance, isConnected } = useWalletStore()
 *   const { currentProgress, setProgress } = usePlayerStore()
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import type { PlayerProgress } from "@lib/types";

// ─── Wallet Store ─────────────────────────────────────────────────────────────

interface WalletState {
  /** Full Stellar public key of the connected account, or empty string */
  walletAddress: string;
  /** XLM balance as a formatted string (e.g. "42.5000000"), or null if not yet fetched */
  walletBalance: string | null;
  /** Whether a wallet is currently connected */
  isConnected: boolean;
  /** Connected wallet network. Hunty mobile requires testnet for signing flows. */
  network: 'testnet' | 'mainnet' | 'unknown';
  /** Optional public G-address used for read-only profile/history access. */
  watchOnlyAddress: string;

  // Actions
  setWallet: (address: string) => void;
  setBalance: (balance: string | null) => void;
  setNetwork: (network: 'testnet' | 'mainnet' | 'unknown') => void;
  setWatchOnlyAddress: (address: string) => void;
  clearWatchOnlyAddress: () => void;
  clearWallet: () => void;
}

/**
 * Wallet store — persisted using SecureStore for mobile security.
 */
export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      walletAddress: "",
      walletBalance: null,
      isConnected: false,
      network: 'unknown',
      watchOnlyAddress: '',

      setWallet: (address) =>
        set({ walletAddress: address, isConnected: Boolean(address) }),

      setBalance: (balance) => set({ walletBalance: balance }),

      setNetwork: (network) => set({ network }),

      setWatchOnlyAddress: (address) => set({ watchOnlyAddress: address.trim() }),

      clearWatchOnlyAddress: () => set({ watchOnlyAddress: '' }),

      clearWallet: () =>
        set({ walletAddress: "", walletBalance: null, isConnected: false, network: 'unknown' }),
    }),
    {
      name: "hunty-wallet",
      // Use SecureStore for mobile persistence
      storage: {
        getItem: async (key: string) => {
          const value = await SecureStore.getItemAsync(key);
          return value ?? null;
        },
        setItem: async (key: string, value: string) => {
          await SecureStore.setItemAsync(key, value);
        },
        removeItem: async (key: string) => {
          await SecureStore.deleteItemAsync(key);
        },
      } as any,
      // Persist wallet identity + network; balance is fetched on demand.
      partialize: (state) => ({
        walletAddress: state.walletAddress,
        network: state.network,
        watchOnlyAddress: state.watchOnlyAddress,
      } as any),
    },
  ),
);

// ─── Player Progress Store ────────────────────────────────────────────────────

interface PlayerState {
  /** Progress for the hunt the player is currently active in, or null */
  currentProgress: PlayerProgress | null;
  /** Map of huntId → Set of completed clue indices for drill-down navigation */
  completedClues: Record<number, Set<number>>;

  // Actions
  setProgress: (progress: PlayerProgress) => void;
  updateClueIndex: (index: number) => void;
  markClueCompleted: (huntId: number, clueIndex: number) => void;
  getCompletedClues: (huntId: number) => Set<number>;
  markCompleted: () => void;
  clearProgress: () => void;
}

/**
 * Player progress store — tracks the active hunt session and completed clues.
 *
 * Set currentProgress when a player registers or resumes a hunt.
 * Clear it when the hunt ends or the player navigates away.
 * Completed clues are tracked per hunt for visual indicators.
 */
export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentProgress: null,
      completedClues: {},

      setProgress: (progress) => set({ currentProgress: progress }),

      updateClueIndex: (index) =>
        set((state) =>
          state.currentProgress
            ? { currentProgress: { ...state.currentProgress, current_clue_index: index } }
            : state,
        ),

      markClueCompleted: (huntId: number, clueIndex: number) =>
        set((state) => {
          const completed = new Set(state.completedClues[huntId] || []);
          completed.add(clueIndex);
          return {
            completedClues: { ...state.completedClues, [huntId]: completed },
          };
        }),

      getCompletedClues: (huntId: number) => {
        return get().completedClues[huntId] || new Set();
      },

      markCompleted: () =>
        set((state) =>
          state.currentProgress
            ? { currentProgress: { ...state.currentProgress, completed: true } }
            : state,
        ),

      clearProgress: () => set({ currentProgress: null }),
    }),
    {
      name: "hunty-player-progress",
      storage: {
        getItem: async (key: string) => {
          const value = await SecureStore.getItemAsync(key);
          if (!value) return null;
          // Parse and convert Sets back
          const parsed = JSON.parse(value);
          const converted = {
            ...parsed,
            completedClues: Object.fromEntries(
              Object.entries(parsed.completedClues).map(([k, v]: [string, any]) => [
                k,
                new Set(v),
              ]),
            ),
          };
          return JSON.stringify(converted);
        },
        setItem: async (key: string, value: string) => {
          // Convert Sets to arrays for storage
          const parsed = JSON.parse(value);
          const converted = {
            ...parsed,
            completedClues: Object.fromEntries(
              Object.entries(parsed.completedClues as Record<string, unknown>).map(([k, v]) => [
                k,
                Array.from((v as Set<number>) ?? []),
              ]),
            ),
          };
          await SecureStore.setItemAsync(key, JSON.stringify(converted));
        },
        removeItem: async (key: string) => {
          await SecureStore.deleteItemAsync(key);
        },
      } as any,
    },
  ),
);

// ─── Settings Store ───────────────────────────────────────────────────────────

interface SettingsState {
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hapticsEnabled: true,
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
    }),
    {
      name: "hunty-settings",
      storage: {
        getItem: async (key: string) => {
          const value = await SecureStore.getItemAsync(key);
          return value ?? null;
        },
        setItem: async (key: string, value: string) => {
          await SecureStore.setItemAsync(key, value);
        },
        removeItem: async (key: string) => {
          await SecureStore.deleteItemAsync(key);
        },
      } as any,
    },
  ),
);
