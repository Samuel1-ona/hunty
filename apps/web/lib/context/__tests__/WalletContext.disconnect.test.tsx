import * as freighterApi from '@stellar/freighter-api';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWallet, WalletProvider } from '@/lib/context/WalletContext';
import * as walletAdapter from '@/lib/walletAdapter';
import { useWalletStore } from '@/lib/wallets/walletStore';
import { usePlayerStore, useWalletStore as useLegacyWalletStore } from '@/store/useStore';

const mockPush = vi.fn();
const mockCancelPendingTransactions = vi.fn();
const mockDisconnectWalletConnect = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/txToast', () => ({
  cancelPendingTransactions: () => mockCancelPendingTransactions(),
}));

vi.mock('@/lib/walletConnect', () => ({
  disconnectWalletConnect: () => mockDisconnectWalletConnect(),
}));

vi.mock('@/lib/walletAdapter', () => ({
  connectWalletProvider: vi.fn(),
  getStoredWalletSession: vi.fn(() => null),
  setStoredWalletSession: vi.fn(),
  clearStoredWalletSession: vi.fn(),
}));

vi.mock('@stellar/freighter-api', () => ({
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

vi.mock('@/hooks/useIsMounted', () => ({
  useIsMounted: () => true,
}));

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

describe('WalletContext disconnect cleanup', () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    vi.stubGlobal('localStorage', localStorageMock);
    mockPush.mockClear();
    mockCancelPendingTransactions.mockClear();
    mockDisconnectWalletConnect.mockClear();
    vi.mocked(walletAdapter.clearStoredWalletSession).mockClear();
    vi.mocked(walletAdapter.getStoredWalletSession).mockReturnValue(null);

    useWalletStore.setState({
      connected: false,
      publicKey: '',
      provider: null,
      lastUsedProvider: null,
      connecting: false,
      error: null,
    });
    useLegacyWalletStore.setState({
      walletAddress: '',
      walletBalance: null,
      isConnected: false,
    });
    usePlayerStore.setState({ currentProgress: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears all wallet/session state, cancels pending txs, and redirects home', async () => {
    vi.mocked(freighterApi.isConnected).mockResolvedValue({
      isConnected: true,
    } as Awaited<ReturnType<typeof freighterApi.isConnected>>);
    vi.mocked(freighterApi.requestAccess).mockResolvedValue({
      address: 'GTESTDISCONNECT123',
    } as Awaited<ReturnType<typeof freighterApi.requestAccess>>);

    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    await waitFor(() => expect(result.current.connected).toBe(true));

    useLegacyWalletStore.getState().setWallet('GTESTDISCONNECT123');
    useLegacyWalletStore.getState().setBalance('10.0');
    usePlayerStore.getState().setProgress({
      hunt_id: 1,
      player: 'GTESTDISCONNECT123',
      current_clue_index: 1,
      completed: false,
      reward_claimed: false,
    });

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.connected).toBe(false);
    expect(result.current.publicKey).toBe('');
    expect(walletAdapter.clearStoredWalletSession).toHaveBeenCalled();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('freighter_public_key');

    const canonical = useWalletStore.getState();
    expect(canonical.connected).toBe(false);
    expect(canonical.publicKey).toBe('');

    const legacy = useLegacyWalletStore.getState();
    expect(legacy.walletAddress).toBe('');
    expect(legacy.walletBalance).toBeNull();
    expect(legacy.isConnected).toBe(false);

    expect(usePlayerStore.getState().currentProgress).toBeNull();
    expect(mockDisconnectWalletConnect).toHaveBeenCalled();
    expect(mockCancelPendingTransactions).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
