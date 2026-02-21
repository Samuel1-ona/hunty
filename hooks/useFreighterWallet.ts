import { useEffect, useState } from "react";
import {
  isConnected,
  getAddress,
  requestAccess,
  WatchWalletChanges,
} from "@stellar/freighter-api";
import { useIsMounted } from "./useIsMounted";

const STORAGE_KEY = "freighter_public_key";

/**
 * Shortens a Stellar public key for display.
 * e.g. GABCDE...UVWXYZ (Stellar keys are 56 chars starting with G)
 */
export function shortenAddress(address: string, chars = 6): string {
  if (!address || address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

interface UseFreighterWalletReturn {
  /** Whether a wallet is currently connected */
  connected: boolean;
  /** Full Stellar public key of connected account, or empty string */
  publicKey: string;
  /** Shortened public key suitable for display in header */
  displayKey: string;
  /** Call this when the user clicks "Connect Wallet" — triggers Freighter popup */
  connect: () => Promise<{ error?: string }>;
  /** Disconnects and clears localStorage */
  disconnect: () => void;
}

/**
 * Manages Freighter wallet connection for the entire app.
 *
 * - On mount: restores session from localStorage, then verifies with getAddress()
 * - On connect: calls requestAccess() to trigger Freighter popup
 * - Watches for account/network changes with WatchWalletChanges
 * - No Context provider or layout wrapper needed — use directly in any component
 *
 * Usage:
 *   const { connected, publicKey, displayKey, connect, disconnect } = useFreighterWallet()
 */
export function useFreighterWallet(): UseFreighterWalletReturn {
  const mounted = useIsMounted();
  const [publicKey, setPublicKey] = useState<string>("");
  const [connected, setConnected] = useState(false);

  // On client mount: restore persisted session and verify it's still valid
  useEffect(() => {
    if (!mounted) return;

    const restoreSession = async () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      try {
        // Check extension is present before calling getAddress
        const connResult = await isConnected();
        if (!connResult.isConnected) {
          // Extension removed or disabled — clear stale session
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        // getAddress() returns the active address without prompting the user.
        // Returns empty string (not an error) if the app isn't on the allow list.
        const addrResult = await getAddress();
        if (addrResult.error || !addrResult.address) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        // Restore session (update if user switched accounts in Freighter)
        const resolvedKey = addrResult.address;
        if (resolvedKey !== saved) {
          localStorage.setItem(STORAGE_KEY, resolvedKey);
        }
        setPublicKey(resolvedKey);
        setConnected(true);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    };

    restoreSession();
  }, [mounted]);

  // Watch for live account/network changes (e.g. user switches accounts in Freighter)
  // Runs once on client mount — watcher polls internally every 3s
  useEffect(() => {
    if (!mounted) return;

    let watcher: InstanceType<typeof WatchWalletChanges> | null = null;

    try {
      watcher = new WatchWalletChanges(3000);
      watcher.watch(
        ({
          address,
        }: {
          address: string;
          network: string;
          networkPassphrase: string;
        }) => {
          if (address) {
            // Account changed or connected
            setPublicKey(address);
            setConnected(true);
            localStorage.setItem(STORAGE_KEY, address);
          } else {
            // Empty address = user locked or disconnected Freighter
            setPublicKey("");
            setConnected(false);
            localStorage.removeItem(STORAGE_KEY);
          }
        },
      );
    } catch {
      // Freighter not installed — watcher silently skipped
    }

    return () => {
      watcher?.stop();
    };
  }, [mounted]);

  /**
   * Trigger Freighter popup to request wallet access.
   * requestAccess() prompts if not yet on the allow list,
   * or returns immediately if the user already approved this app.
   */
  const connect = async (): Promise<{ error?: string }> => {
    try {
      const connResult = await isConnected();
      if (!connResult.isConnected) {
        return {
          error:
            "Freighter extension not found. Please install it from freighter.app",
        };
      }

      // requestAccess() returns { address: string, error?: string }
      // error is a plain string per the Freighter API docs
      const accessResult = await requestAccess();

      if (accessResult.error) {
        return { error: String(accessResult.error) };
      }

      const address = accessResult.address;
      if (!address) {
        return { error: "No public key returned. Please try again." };
      }

      localStorage.setItem(STORAGE_KEY, address);
      setPublicKey(address);
      setConnected(true);
      return {};
    } catch (err) {
      return {
        error:
          err instanceof Error
            ? err.message
            : "Unexpected error during connection.",
      };
    }
  };

  const disconnect = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPublicKey("");
    setConnected(false);
  };

  return {
    connected,
    publicKey,
    displayKey: shortenAddress(publicKey),
    connect,
    disconnect,
  };
}
