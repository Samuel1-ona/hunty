import * as freighterApi from "@stellar/freighter-api";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { shortenAddress, useWallet, WalletProvider } from "@/lib/context/WalletContext";
import {
  getWalletStatusLabel,
  INITIAL_WALLET_STATE,
  isValidTransition,
  useWalletMachine,
  walletReducer,
  type WalletMachineState,
} from "@/lib/wallet/walletMachine";
import * as walletAdapter from "@/lib/walletAdapter";
import { useWalletStore } from "@/lib/wallets/walletStore";
import { usePlayerStore, useWalletStore as useLegacyWalletStore } from "@/store/useStore";

const mockPush = vi.fn();
const mockCancelPendingTransactions = vi.fn();
const mockDisconnectWalletConnect = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/txToast", () => ({
  cancelPendingTransactions: () => mockCancelPendingTransactions(),
}));

vi.mock("@/lib/walletConnect", () => ({
  disconnectWalletConnect: () => mockDisconnectWalletConnect(),
}));

vi.mock("@/lib/walletAdapter", () => ({
  connectWalletProvider: vi.fn(),
  getStoredWalletSession: vi.fn(() => null),
  setStoredWalletSession: vi.fn(),
  clearStoredWalletSession: vi.fn(),
  getActiveWalletAdapter: vi.fn(),
}));

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  getAddress: vi.fn(),
  requestAccess: vi.fn(),
  WatchWalletChanges: vi.fn().mockImplementation(function (this: {
    watch: (cb: unknown) => void;
    stop: () => void;
  }) {
    this.watch = () => {};
    this.stop = () => {};
  }),
}));

vi.mock("@/hooks/useIsMounted", () => ({
  useIsMounted: () => true,
}));

const TEST_PUBLIC_KEY = "GBZXN7PIRZGNMHGA728RGRYA7QODRNQ1234567890123456789012";
const TEST_ALBEDO_KEY = "GALBEDO1234567890123456789012345678901234567890123456";

const storage: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
  }),
};

function wrapper({ children }: { children: ReactNode }) {
  return createElement(WalletProvider, null, children);
}

describe("WalletContext connect/disconnect state machine", () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    vi.stubGlobal("localStorage", localStorageMock);
    mockPush.mockClear();
    mockCancelPendingTransactions.mockClear();
    mockDisconnectWalletConnect.mockClear();
    vi.mocked(walletAdapter.clearStoredWalletSession).mockClear();
    vi.mocked(walletAdapter.setStoredWalletSession).mockClear();
    vi.mocked(walletAdapter.connectWalletProvider).mockReset();
    vi.mocked(walletAdapter.getStoredWalletSession).mockReturnValue(null);
    vi.mocked(freighterApi.isConnected).mockReset();
    vi.mocked(freighterApi.requestAccess).mockReset();
    vi.mocked(freighterApi.getAddress).mockReset();

    useWalletStore.setState({
      status: "idle",
      connected: false,
      publicKey: "",
      provider: null,
      lastUsedProvider: null,
      connecting: false,
      error: null,
    });
    useLegacyWalletStore.setState({
      walletAddress: "",
      walletBalance: null,
      isConnected: false,
    });
    usePlayerStore.setState({ currentProgress: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("Initial idle state", () => {
    it("starts in idle state with no wallet connected", () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      expect(result.current.connected).toBe(false);
      expect(result.current.publicKey).toBe("");
      expect(result.current.displayKey).toBe("");
      expect(result.current.walletProvider).toBeNull();

      const store = useWalletStore.getState();
      expect(store.status).toBe("idle");
      expect(store.connected).toBe(false);
      expect(store.connecting).toBe(false);
      expect(store.publicKey).toBe("");
      expect(store.provider).toBeNull();
      expect(store.error).toBeNull();
    });

    it("formats displayKey correctly when empty and populated", () => {
      expect(shortenAddress("")).toBe("");
      expect(shortenAddress(TEST_PUBLIC_KEY)).toBe(
        `${TEST_PUBLIC_KEY.slice(0, 6)}...${TEST_PUBLIC_KEY.slice(-6)}`
      );
    });
  });

  describe("Transition: idle -> connecting", () => {
    it("enters connecting state when connect is initiated", async () => {
      let resolveIsConnected!: (value: { isConnected: boolean }) => void;
      const isConnectedPromise = new Promise<{ isConnected: boolean }>((res) => {
        resolveIsConnected = res;
      });
      vi.mocked(freighterApi.isConnected).mockReturnValue(
        isConnectedPromise as unknown as ReturnType<typeof freighterApi.isConnected>
      );

      const { result } = renderHook(() => useWallet(), { wrapper });

      let connectPromise: Promise<{ error?: string }>;
      act(() => {
        connectPromise = result.current.connect("freighter");
      });

      await waitFor(() => {
        const store = useWalletStore.getState();
        expect(store.status).toBe("connecting");
        expect(store.connecting).toBe(true);
        expect(store.connected).toBe(false);
        expect(store.provider).toBe("freighter");
      });

      // Cleanup pending promise
      await act(async () => {
        resolveIsConnected({ isConnected: false });
        await connectPromise;
      });
    });
  });

  describe("Transition: connecting -> connected", () => {
    it("transitions to connected when Freighter wallet connects successfully", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: true } as Awaited<
        ReturnType<typeof freighterApi.isConnected>
      >);
      vi.mocked(freighterApi.requestAccess).mockResolvedValue({
        address: TEST_PUBLIC_KEY,
      } as Awaited<ReturnType<typeof freighterApi.requestAccess>>);

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect("freighter");
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      expect(result.current.publicKey).toBe(TEST_PUBLIC_KEY);
      expect(result.current.displayKey).toBe(
        `${TEST_PUBLIC_KEY.slice(0, 6)}...${TEST_PUBLIC_KEY.slice(-6)}`
      );
      expect(result.current.walletProvider).toBe("freighter");

      // Verify canonical Zustand store sync
      const canonical = useWalletStore.getState();
      expect(canonical.status).toBe("connected");
      expect(canonical.connected).toBe(true);
      expect(canonical.connecting).toBe(false);
      expect(canonical.publicKey).toBe(TEST_PUBLIC_KEY);
      expect(canonical.provider).toBe("freighter");
      expect(canonical.lastUsedProvider).toBe("freighter");
      expect(canonical.error).toBeNull();

      // Verify legacy store sync
      const legacy = useLegacyWalletStore.getState();
      expect(legacy.walletAddress).toBe(TEST_PUBLIC_KEY);

      // Verify storage persistence
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "freighter_public_key",
        TEST_PUBLIC_KEY
      );
      expect(walletAdapter.setStoredWalletSession).toHaveBeenCalledWith(
        "freighter",
        TEST_PUBLIC_KEY
      );
    });

    it("transitions to connected with custom provider (Albedo)", async () => {
      vi.mocked(walletAdapter.connectWalletProvider).mockResolvedValue(TEST_ALBEDO_KEY);

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect("albedo");
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      expect(result.current.publicKey).toBe(TEST_ALBEDO_KEY);
      expect(result.current.walletProvider).toBe("albedo");

      const store = useWalletStore.getState();
      expect(store.status).toBe("connected");
      expect(store.provider).toBe("albedo");
      expect(walletAdapter.setStoredWalletSession).toHaveBeenCalledWith(
        "albedo",
        TEST_ALBEDO_KEY
      );
    });
  });

  describe("Transition: connected -> disconnected", () => {
    it("transitions from connected to disconnected and performs complete cleanup", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: true } as Awaited<
        ReturnType<typeof freighterApi.isConnected>
      >);
      vi.mocked(freighterApi.requestAccess).mockResolvedValue({
        address: TEST_PUBLIC_KEY,
      } as Awaited<ReturnType<typeof freighterApi.requestAccess>>);

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect("freighter");
      });

      await waitFor(() => expect(result.current.connected).toBe(true));

      // Set extra legacy state to ensure it is cleared
      useLegacyWalletStore.getState().setWallet(TEST_PUBLIC_KEY);
      useLegacyWalletStore.getState().setBalance("100.0");
      usePlayerStore.getState().setProgress({
        hunt_id: 1,
        player: TEST_PUBLIC_KEY,
        current_clue_index: 2,
        completed: false,
        reward_claimed: false,
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.connected).toBe(false);
      expect(result.current.publicKey).toBe("");
      expect(result.current.displayKey).toBe("");
      expect(result.current.walletProvider).toBeNull();

      // State machine store state
      const canonical = useWalletStore.getState();
      expect(canonical.status).toBe("disconnected");
      expect(canonical.connected).toBe(false);
      expect(canonical.publicKey).toBe("");
      expect(canonical.provider).toBeNull();

      // Legacy stores cleared
      const legacy = useLegacyWalletStore.getState();
      expect(legacy.walletAddress).toBe("");
      expect(legacy.isConnected).toBe(false);
      expect(usePlayerStore.getState().currentProgress).toBeNull();

      // Side-effect cleanup
      expect(walletAdapter.clearStoredWalletSession).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("freighter_public_key");
      expect(mockDisconnectWalletConnect).toHaveBeenCalled();
      expect(mockCancelPendingTransactions).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  describe("Error paths (connecting -> error)", () => {
    it("transitions to error when Freighter extension is not installed", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: false } as Awaited<
        ReturnType<typeof freighterApi.isConnected>
      >);

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect("freighter");
      });

      expect(result.current.connected).toBe(false);
      expect(result.current.publicKey).toBe("");

      const store = useWalletStore.getState();
      expect(store.status).toBe("error");
      expect(store.connected).toBe(false);
      expect(store.error).toBe(
        "Freighter extension not found. Please install it from freighter.app"
      );
    });

    it("transitions to error when user rejects access", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: true } as Awaited<
        ReturnType<typeof freighterApi.isConnected>
      >);
      vi.mocked(freighterApi.requestAccess).mockResolvedValue({
        error: "User declined access to wallet",
      } as Awaited<ReturnType<typeof freighterApi.requestAccess>>);

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect("freighter");
      });

      expect(result.current.connected).toBe(false);

      const store = useWalletStore.getState();
      expect(store.status).toBe("error");
      expect(store.connected).toBe(false);
      expect(store.error).toBe("User declined access to wallet");
    });

    it("transitions to error when wallet access succeeds with empty address", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: true } as Awaited<
        ReturnType<typeof freighterApi.isConnected>
      >);
      vi.mocked(freighterApi.requestAccess).mockResolvedValue({
        address: "",
      } as Awaited<ReturnType<typeof freighterApi.requestAccess>>);

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect("freighter");
      });

      expect(result.current.connected).toBe(false);

      const store = useWalletStore.getState();
      expect(store.status).toBe("error");
      expect(store.connected).toBe(false);
      expect(store.error).toBe("No public key returned. Please try again.");
    });

    it("transitions to error when connection throws an unexpected error", async () => {
      vi.mocked(freighterApi.isConnected).mockRejectedValue(
        new Error("Connection timed out waiting for popup response")
      );

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect("freighter");
      });

      expect(result.current.connected).toBe(false);

      const store = useWalletStore.getState();
      expect(store.status).toBe("error");
      expect(store.connected).toBe(false);
      expect(store.error).toBe("Connection timed out waiting for popup response");
    });
  });

  describe("Wallet Machine Reducer & Transition Validations", () => {
    it("handles all defined transitions in walletReducer correctly", () => {
      // 1. Initial
      let state: WalletMachineState = INITIAL_WALLET_STATE;
      expect(state.status).toBe("idle");
      expect(state.publicKey).toBe("");
      expect(state.provider).toBeNull();
      expect(state.error).toBeNull();

      // 2. CONNECT_INIT -> connecting
      state = walletReducer(state, { type: "CONNECT_INIT", provider: "freighter" });
      expect(state.status).toBe("connecting");
      expect(state.provider).toBe("freighter");
      expect(state.error).toBeNull();

      // 3. CONNECT_SUCCESS -> connected
      state = walletReducer(state, {
        type: "CONNECT_SUCCESS",
        publicKey: TEST_PUBLIC_KEY,
        provider: "freighter",
      });
      expect(state.status).toBe("connected");
      expect(state.publicKey).toBe(TEST_PUBLIC_KEY);
      expect(state.provider).toBe("freighter");

      // 4. DISCONNECT -> disconnected
      state = walletReducer(state, { type: "DISCONNECT" });
      expect(state.status).toBe("disconnected");
      expect(state.publicKey).toBe("");
      expect(state.provider).toBeNull();

      // 5. CONNECT_INIT from disconnected -> connecting
      state = walletReducer(state, { type: "CONNECT_INIT", provider: "albedo" });
      expect(state.status).toBe("connecting");
      expect(state.provider).toBe("albedo");

      // 6. CONNECT_ERROR -> error
      state = walletReducer(state, { type: "CONNECT_ERROR", error: "Albedo popup closed" });
      expect(state.status).toBe("error");
      expect(state.error).toBe("Albedo popup closed");

      // 7. CLEAR_ERROR -> idle
      state = walletReducer(state, { type: "CLEAR_ERROR" });
      expect(state.status).toBe("idle");
      expect(state.error).toBeNull();

      // 8. SESSION_RESTORED from idle -> connected
      state = walletReducer(state, {
        type: "SESSION_RESTORED",
        publicKey: TEST_PUBLIC_KEY,
        provider: "freighter",
      });
      expect(state.status).toBe("connected");
      expect(state.publicKey).toBe(TEST_PUBLIC_KEY);
    });

    it("verifies isValidTransition checks against the finite state machine transition table", () => {
      // idle transitions
      expect(isValidTransition("idle", "CONNECT_INIT")).toBe(true);
      expect(isValidTransition("idle", "SESSION_RESTORED")).toBe(true);
      expect(isValidTransition("idle", "CONNECT_SUCCESS")).toBe(false);
      expect(isValidTransition("idle", "DISCONNECT")).toBe(false);

      // connecting transitions
      expect(isValidTransition("connecting", "CONNECT_SUCCESS")).toBe(true);
      expect(isValidTransition("connecting", "CONNECT_ERROR")).toBe(true);
      expect(isValidTransition("connecting", "DISCONNECT")).toBe(true);
      expect(isValidTransition("connecting", "SESSION_RESTORED")).toBe(false);

      // connected transitions
      expect(isValidTransition("connected", "DISCONNECT")).toBe(true);
      expect(isValidTransition("connected", "CONNECT_ERROR")).toBe(true);
      expect(isValidTransition("connected", "CONNECT_INIT")).toBe(false);

      // disconnected transitions
      expect(isValidTransition("disconnected", "CONNECT_INIT")).toBe(true);
      expect(isValidTransition("disconnected", "SESSION_RESTORED")).toBe(true);
      expect(isValidTransition("disconnected", "CONNECT_SUCCESS")).toBe(false);

      // error transitions
      expect(isValidTransition("error", "CONNECT_INIT")).toBe(true);
      expect(isValidTransition("error", "CLEAR_ERROR")).toBe(true);
      expect(isValidTransition("error", "DISCONNECT")).toBe(true);
      expect(isValidTransition("error", "CONNECT_SUCCESS")).toBe(false);
    });

    it("returns correct labels for all wallet states via getWalletStatusLabel", () => {
      expect(getWalletStatusLabel("idle")).toBe("Connect Wallet");
      expect(getWalletStatusLabel("connecting")).toBe("Connecting…");
      expect(getWalletStatusLabel("connected")).toBe("Connected");
      expect(getWalletStatusLabel("disconnected")).toBe("Disconnected");
      expect(getWalletStatusLabel("error")).toBe("Connection Failed");
    });
  });

  describe("Direct useWalletMachine hook test", () => {
    it("can run state machine transitions directly via hook", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: true } as Awaited<
        ReturnType<typeof freighterApi.isConnected>
      >);
      vi.mocked(freighterApi.requestAccess).mockResolvedValue({
        address: TEST_PUBLIC_KEY,
      } as Awaited<ReturnType<typeof freighterApi.requestAccess>>);

      const { result } = renderHook(() => useWalletMachine());

      expect(result.current.state.status).toBe("idle");
      expect(result.current.isActive).toBe(false);

      await act(async () => {
        await result.current.connect("freighter");
      });

      expect(result.current.state.status).toBe("connected");
      expect(result.current.state.publicKey).toBe(TEST_PUBLIC_KEY);
      expect(result.current.isActive).toBe(true);

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.state.status).toBe("disconnected");
      expect(result.current.state.publicKey).toBe("");
      expect(result.current.isActive).toBe(false);
    });
  });
});
