/**
 * Zustand wallet store — synced from the wallet state machine.
 *
 * This store is the cross-component communication layer. It is updated by
 * the `WalletContext` whenever the state machine transitions, so any
 * component that subscribes via `useWalletStore` sees the latest state
 * without needing to be inside the provider tree.
 *
 * Persists the last-used provider to localStorage so the app can
 * restore the session on the next visit.
 */

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { WalletProvider } from "./types"
import type { WalletStatus } from "@/lib/wallet"

export type WalletState = {
  /** Machine-readable status from the wallet state machine */
  status: WalletStatus
  /** Whether a wallet is currently connected (derived from status) */
  connected: boolean
  /** Full Stellar public key (empty string when disconnected) */
  publicKey: string
  /** The provider that established the current connection */
  provider: WalletProvider | null
  /** The last provider the user explicitly connected with */
  lastUsedProvider: WalletProvider | null
  /** In-progress connection attempt (derived from status === "connecting") */
  connecting: boolean
  /** Last connection error message, if any */
  error: string | null
}

export type WalletActions = {
  /**
   * Sync the entire machine state into the store.
   * Called by the WalletContext after every state machine transition.
   */
  syncFromMachine: (params: {
    status: WalletStatus
    publicKey: string
    provider: WalletProvider | null
    error: string | null
  }) => void
  /** Override last-used provider (e.g., if session is restored externally) */
  setLastUsedProvider: (provider: WalletProvider) => void
}

export type WalletStore = WalletState & WalletActions

const initialState: WalletState = {
  status: "idle",
  connected: false,
  publicKey: "",
  provider: null,
  lastUsedProvider: null,
  connecting: false,
  error: null,
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      ...initialState,

      syncFromMachine: ({ status, publicKey, provider, error }) =>
        set((prev) => ({
          status,
          connected: status === "connected",
          publicKey,
          provider,
          // Only overwrite lastUsedProvider when a non-null provider is given.
          // This preserves the value across disconnect/error transitions.
          lastUsedProvider: provider ?? prev.lastUsedProvider,
          connecting: status === "connecting",
          error,
        })),

      setLastUsedProvider: (provider) => set({ lastUsedProvider: provider }),
    }),
    {
      name: "hunty_wallet_store",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : memoryStorage()
      ),
      // Only persist non-sensitive fields
      partialize: (state) => ({
        lastUsedProvider: state.lastUsedProvider,
      }),
    }
  )
)

// Minimal in-memory storage for SSR safety
function memoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => { store.set(k, v) },
    removeItem: (k) => { store.delete(k) },
    clear: () => { store.clear() },
    get length() { return store.size },
    key: (i) => [...store.keys()][i] ?? null,
  }
}
