/**
 * Wallet Connection State Machine
 *
 * Replaces ad-hoc boolean flags with a proper finite state machine:
 *
 *   idle ──► connecting ──► connected ◄── session_restored
 *    │                        │
 *    └──► disconnected ◄──────┘
 *    │                        │
 *    └──► error ◄─────────────┘
 *
 * Each state has a well-defined set of valid transitions, making the
 * connection flow predictable and testable.
 *
 * @module walletMachine
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { getAddress, isConnected, requestAccess, WatchWalletChanges } from '@stellar/freighter-api';

import type { WalletProvider } from '@/lib/wallets/types';
import {
  connectWalletProvider,
  getStoredWalletSession,
  setStoredWalletSession,
  clearStoredWalletSession,
} from '@/lib/walletAdapter';
import { disconnectWalletConnect } from '@/lib/walletConnect';
import { cancelPendingTransactions } from '@/lib/txToast';

// ─── Storage key for legacy freighter-only persistence ─────────────────────
const STORAGE_KEY = 'freighter_public_key';

// ─── State types ───────────────────────────────────────────────────────────

/**
 * Machine-readable wallet connection status.
 * - `idle`          — No wallet connected, not attempting to connect.
 * - `connecting`    — Connection attempt in progress (wallet popup open).
 * - `connected`     — Wallet is connected and ready.
 * - `disconnected`  — Explicitly disconnected by the user.
 * - `error`         - Last connection attempt failed.
 */
export type WalletStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Full wallet machine state.
 * Every field is present in every status — error and provider are null
 * when they aren't relevant.
 */
export interface WalletMachineState {
  status: WalletStatus;
  publicKey: string;
  provider: WalletProvider | null;
  error: string | null;
}

// ─── Events ────────────────────────────────────────────────────────────────

export type WalletEvent =
  | { type: 'CONNECT_INIT'; provider: WalletProvider }
  | { type: 'CONNECT_SUCCESS'; publicKey: string; provider: WalletProvider }
  | { type: 'CONNECT_ERROR'; error: string }
  | { type: 'DISCONNECT' }
  | { type: 'SESSION_RESTORED'; publicKey: string; provider: WalletProvider }
  | { type: 'CLEAR_ERROR' };

// ─── Initial state ─────────────────────────────────────────────────────────

export const INITIAL_WALLET_STATE: WalletMachineState = {
  status: 'idle',
  publicKey: '',
  provider: null,
  error: null,
};

// ─── Valid transition map (for reference / testing) ────────────────────────

const VALID_TRANSITIONS: Record<WalletStatus, WalletEvent['type'][]> = {
  idle: ['CONNECT_INIT', 'SESSION_RESTORED'],
  connecting: ['CONNECT_SUCCESS', 'CONNECT_ERROR', 'DISCONNECT'],
  connected: ['DISCONNECT', 'CONNECT_ERROR'],
  disconnected: ['CONNECT_INIT', 'SESSION_RESTORED'],
  error: ['CONNECT_INIT', 'CLEAR_ERROR', 'DISCONNECT'],
};

/**
 * Returns whether a transition is valid from the current status.
 * Useful for assertions in tests and for guarded dispatch wrappers.
 */
export function isValidTransition(from: WalletStatus, eventType: WalletEvent['type']): boolean {
  return VALID_TRANSITIONS[from]?.includes(eventType) ?? false;
}

// ─── Reducer ───────────────────────────────────────────────────────────────

export function walletReducer(state: WalletMachineState, event: WalletEvent): WalletMachineState {
  switch (event.type) {
    case 'CONNECT_INIT':
      return {
        status: 'connecting',
        publicKey: '',
        provider: event.provider,
        error: null,
      };

    case 'CONNECT_SUCCESS':
      return {
        status: 'connected',
        publicKey: event.publicKey,
        provider: event.provider,
        error: null,
      };

    case 'CONNECT_ERROR':
      return {
        status: 'error',
        publicKey: state.publicKey,
        provider: state.provider,
        error: event.error,
      };

    case 'DISCONNECT':
      return {
        status: 'disconnected',
        publicKey: '',
        provider: null,
        error: null,
      };

    case 'SESSION_RESTORED':
      return {
        status: 'connected',
        publicKey: event.publicKey,
        provider: event.provider,
        error: null,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        status: state.status === 'error' ? 'idle' : state.status,
        error: null,
      };

    default:
      return state;
  }
}

// ─── Helpers for derived state ─────────────────────────────────────────────

/**
 * Returns a user-friendly label for the current status.
 */
export function getWalletStatusLabel(status: WalletStatus): string {
  switch (status) {
    case 'idle':
      return 'Connect Wallet';
    case 'connecting':
      return 'Connecting…';
    case 'connected':
      return 'Connected';
    case 'disconnected':
      return 'Disconnected';
    case 'error':
      return 'Connection Failed';
  }
}

// ─── Auto-reconnect logic ──────────────────────────────────────────────────

/**
 * Attempts to restore a previously-connected wallet session.
 *
 * Priority:
 * 1. Stored session from `walletAdapter` (provider-specific)
 * 2. Legacy `freighter_public_key` localStorage key
 *
 * Returns the restored state or `null` if nothing could be restored.
 */
export async function tryRestoreSession(): Promise<{
  publicKey: string;
  provider: WalletProvider;
} | null> {
  // Priority 1: stored provider session
  const session = getStoredWalletSession();
  if (session) {
    try {
      const address = await connectWalletProvider(session.provider);
      setStoredWalletSession(session.provider, address);
      return { publicKey: address, provider: session.provider };
    } catch {
      clearStoredWalletSession();
    }
  }

  // Priority 2: legacy freighter key
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;

  try {
    const connResult = await isConnected();
    if (!connResult.isConnected) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const addrResult = await getAddress();
    if (addrResult.error || !addrResult.address) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const resolvedKey = addrResult.address;
    if (resolvedKey !== saved) {
      localStorage.setItem(STORAGE_KEY, resolvedKey);
    }

    return { publicKey: resolvedKey, provider: 'freighter' };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

// ─── React hook ────────────────────────────────────────────────────────────

export interface UseWalletMachineReturn {
  /** Current machine state */
  state: WalletMachineState;
  /** Initiate connection with a specific wallet provider */
  connect: (provider?: WalletProvider) => Promise<void>;
  /** Disconnect and clear all session state */
  disconnect: () => void;
  /** Clear error state and return to idle */
  clearError: () => void;
  /** Whether the machine is in a non-idle, non-disconnected state */
  isActive: boolean;
  /** True while the initial auto-reconnect check is running */
  isRestoring: boolean;
}

/**
 * React hook that runs the wallet state machine, handles auto-reconnect
 * on mount, and watches for external account changes (Freighter switch/lock).
 */
export function useWalletMachine(): UseWalletMachineReturn {
  const [state, dispatch] = useReducer(walletReducer, INITIAL_WALLET_STATE);
  const [isRestoring, setIsRestoring] = useStateLocal(true);
  const watcherRef = useRef<InstanceType<typeof WatchWalletChanges> | null>(null);

  // ── 1. Auto-reconnect on mount ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const session = await tryRestoreSession();
        if (cancelled) return;
        if (session) {
          dispatch({
            type: 'SESSION_RESTORED',
            publicKey: session.publicKey,
            provider: session.provider,
          });
        }
      } catch {
        // Silently fail — user will need to connect manually
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── 2. Watch for Freighter account changes ───────────────────────────
  useEffect(() => {
    if (state.status !== 'connected') return;

    try {
      watcherRef.current = new WatchWalletChanges(3000);
      watcherRef.current.watch(
        ({ address }: { address: string; network: string; networkPassphrase: string }) => {
          if (address && address !== state.publicKey) {
            // Account switched — update
            dispatch({ type: 'CONNECT_SUCCESS', publicKey: address, provider: 'freighter' });
            localStorage.setItem(STORAGE_KEY, address);
            setStoredWalletSession('freighter', address);
          } else if (!address) {
            // User locked or disconnected Freighter
            dispatch({ type: 'DISCONNECT' });
            clearWalletSideEffects();
          }
        }
      );
    } catch {
      // Freighter not installed — watcher silently skipped
    }

    return () => {
      watcherRef.current?.stop();
      watcherRef.current = null;
    };
  }, [state.status, state.publicKey]);

  // ── 3. Connect handler ───────────────────────────────────────────────
  const connect = useCallback(async (provider: WalletProvider = 'freighter') => {
    dispatch({ type: 'CONNECT_INIT', provider });

    try {
      if (provider === 'freighter') {
        const connResult = await isConnected();
        if (!connResult.isConnected) {
          dispatch({
            type: 'CONNECT_ERROR',
            error: 'Freighter extension not found. Please install it from freighter.app',
          });
          return;
        }

        const accessResult = await requestAccess();
        if (accessResult.error) {
          dispatch({ type: 'CONNECT_ERROR', error: String(accessResult.error) });
          return;
        }

        const address = accessResult.address;
        if (!address) {
          dispatch({ type: 'CONNECT_ERROR', error: 'No public key returned. Please try again.' });
          return;
        }

        setStoredWalletSession('freighter', address);
        localStorage.setItem(STORAGE_KEY, address);
        dispatch({ type: 'CONNECT_SUCCESS', publicKey: address, provider: 'freighter' });
      } else {
        const address = await connectWalletProvider(provider);
        setStoredWalletSession(provider, address);
        dispatch({ type: 'CONNECT_SUCCESS', publicKey: address, provider });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error during connection.';
      dispatch({ type: 'CONNECT_ERROR', error: message });
    }
  }, []);

  // ── 4. Disconnect handler ────────────────────────────────────────────
  const disconnect = useCallback(() => {
    watcherRef.current?.stop();
    dispatch({ type: 'DISCONNECT' });
    clearWalletSideEffects();
  }, []);

  // ── 5. Clear error ───────────────────────────────────────────────────
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  return {
    state,
    connect,
    disconnect,
    clearError,
    isActive: state.status === 'connecting' || state.status === 'connected',
    isRestoring,
  };
}

// ─── Internal helpers ──────────────────────────────────────────────────────

function clearWalletSideEffects(): void {
  clearStoredWalletSession();
  localStorage.removeItem(STORAGE_KEY);
  disconnectWalletConnect();
  cancelPendingTransactions();
}

/**
 * A simple useState that returns `false` on the server to avoid hydration
 * mismatches — the initial restore is always `true` on the client.
 */
function useStateLocal(initial: boolean): [boolean, (v: boolean) => void] {
  const [val, setVal] = useReducer(
    (_prev: boolean, next: boolean) => next,
    typeof window === 'undefined' ? false : initial
  );
  return [val, setVal];
}
