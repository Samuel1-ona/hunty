import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/wallet/balance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/wallet/balance')>();
  return { ...actual, fetchWalletBalance: vi.fn() };
});
vi.mock('@/lib/nftUtils', () => ({ fetchPlayerNfts: vi.fn() }));

import { fetchWalletBalance, WalletBalanceError } from '@/lib/wallet/balance';
import { fetchPlayerNfts } from '@/lib/nftUtils';
import { queryCachePolicy } from '@/lib/queryKeys';
import {
  predictWalletBalanceChange,
  resetWalletBalanceListeners,
  settleWalletBalance,
} from '@/lib/wallet/balanceEvents';
import { useWalletBalance } from '@/hooks/useWalletBalance';

const ADDRESS = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37';

const mockFetchBalance = vi.mocked(fetchWalletBalance);
const mockFetchNfts = vi.mocked(fetchPlayerNfts);

function snapshot(
  xlm: number,
  unfunded = false,
  tokens: Array<{ assetCode: string; assetIssuer: string; balance: number }> = []
) {
  return { address: ADDRESS, xlm, tokens, unfunded, fetchedAt: Date.now(), optimistic: false };
}

function nfts(count: number) {
  return Array.from({ length: count }, (_, index) => ({ id: index })) as never[];
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

function renderBalance(address: string | undefined = ADDRESS) {
  const { wrapper, queryClient } = createWrapper();
  const view = renderHook(() => useWalletBalance({ address }), { wrapper });
  return { ...view, queryClient };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetWalletBalanceListeners();
  mockFetchBalance.mockResolvedValue(snapshot(24.2453));
  mockFetchNfts.mockResolvedValue(nfts(3));
});

afterEach(() => {
  resetWalletBalanceListeners();
});

describe('useWalletBalance', () => {
  it('stays idle with no connected address', async () => {
    const { result } = renderBalance('');

    expect(result.current.xlm).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.formattedXlm).toBe('—');
    expect(mockFetchBalance).not.toHaveBeenCalled();
    expect(mockFetchNfts).not.toHaveBeenCalled();
  });

  it('loads the XLM balance and NFT count', async () => {
    const { result } = renderBalance();

    await waitFor(() => expect(result.current.xlm).toBe(24.2453));
    expect(result.current.formattedXlm).toBe('24.2453');
    expect(result.current.nftCount).toBe(3);
    expect(result.current.error).toBeNull();
    expect(result.current.isStale).toBe(false);
    expect(result.current.lastUpdated).toBeGreaterThan(0);
  });

  it('exposes non-native token balances', async () => {
    mockFetchBalance.mockResolvedValue(
      snapshot(24.2453, false, [{ assetCode: 'USDC', assetIssuer: 'GISSUER', balance: 10 }])
    );
    const { result } = renderBalance();

    await waitFor(() => expect(result.current.tokens).toHaveLength(1));
    expect(result.current.tokens[0]).toEqual({
      assetCode: 'USDC',
      assetIssuer: 'GISSUER',
      balance: 10,
    });
  });

  it('hands out a stable empty array for a wallet holding no tokens', async () => {
    const { result } = renderBalance();

    await waitFor(() => expect(result.current.xlm).toBe(24.2453));
    const first = result.current.tokens;
    expect(first).toEqual([]);
    // A fresh array each render would churn any consumer memoising on it.
    expect(result.current.tokens).toBe(first);
  });

  it('reports an unfunded account as a real zero balance', async () => {
    mockFetchBalance.mockResolvedValue(snapshot(0, true));
    const { result } = renderBalance();

    await waitFor(() => expect(result.current.unfunded).toBe(true));
    expect(result.current.xlm).toBe(0);
    expect(result.current.formattedXlm).toBe('0.00');
    expect(result.current.error).toBeNull();
  });

  it('polls on the 30 second cadence the issue asks for', () => {
    expect(queryCachePolicy.walletBalance.refetchInterval).toBe(30_000);
    // A stale window shorter than the interval keeps a remount between ticks honest.
    expect(queryCachePolicy.walletBalance.staleTime).toBeLessThan(
      queryCachePolicy.walletBalance.refetchInterval
    );
  });

  it('refetches on the polling interval', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderBalance();
      await vi.waitFor(() => expect(result.current.xlm).toBe(24.2453));
      expect(mockFetchBalance).toHaveBeenCalledTimes(1);

      mockFetchBalance.mockResolvedValue(snapshot(30));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(queryCachePolicy.walletBalance.refetchInterval + 100);
      });

      await vi.waitFor(() => expect(mockFetchBalance.mock.calls.length).toBeGreaterThan(1));
      await vi.waitFor(() => expect(result.current.xlm).toBe(30));
    } finally {
      vi.useRealTimers();
    }
  });

  it('applies an optimistic delta immediately', async () => {
    const { result } = renderBalance();
    await waitFor(() => expect(result.current.xlm).toBe(24.2453));

    act(() => result.current.applyOptimisticDelta({ xlmDelta: -4.2453, nftDelta: 1 }));

    await waitFor(() => expect(result.current.xlm).toBe(20));
    expect(result.current.nftCount).toBe(4);
    expect(result.current.isOptimistic).toBe(true);
  });

  it('clamps an optimistic spend that would go negative', async () => {
    const { result } = renderBalance();
    await waitFor(() => expect(result.current.xlm).toBe(24.2453));

    act(() => result.current.applyOptimisticDelta({ xlmDelta: -1_000 }));

    await waitFor(() => expect(result.current.xlm).toBe(0));
  });

  it('accepts optimistic updates emitted from outside the React tree', async () => {
    const { result } = renderBalance();
    await waitFor(() => expect(result.current.xlm).toBe(24.2453));

    act(() => predictWalletBalanceChange({ xlmDelta: -0.2453 }));

    await waitFor(() => expect(result.current.xlm).toBe(24));
    expect(result.current.isOptimistic).toBe(true);
  });

  it('reconciles the optimistic value against chain state when a transaction settles', async () => {
    const { result } = renderBalance();
    await waitFor(() => expect(result.current.xlm).toBe(24.2453));

    act(() => result.current.applyOptimisticDelta({ xlmDelta: -10 }));
    await waitFor(() => expect(result.current.xlm).toBe(14.2453));

    mockFetchBalance.mockResolvedValue(snapshot(13.9));
    await act(async () => {
      settleWalletBalance();
    });

    await waitFor(() => expect(result.current.xlm).toBe(13.9));
    expect(result.current.isOptimistic).toBe(false);
  });

  it('keeps the last known balance on screen when a refresh fails', async () => {
    const { result } = renderBalance();
    await waitFor(() => expect(result.current.xlm).toBe(24.2453));

    mockFetchBalance.mockRejectedValue(new WalletBalanceError('network', 'offline'));
    vi.useFakeTimers();
    try {
      await act(async () => {
        result.current.refresh();
        await vi.advanceTimersByTimeAsync(10_000);
      });
      await vi.waitFor(() => expect(result.current.error).toMatch(/can't reach/i));
    } finally {
      vi.useRealTimers();
    }
    // The value survives the failure — a blank balance is worse than a stale one.
    expect(result.current.xlm).toBe(24.2453);
    expect(result.current.isStale).toBe(true);
  });

  it('surfaces a readable error with no value to fall back on', async () => {
    mockFetchBalance.mockRejectedValue(new WalletBalanceError('timeout', 'slow'));
    mockFetchNfts.mockRejectedValue(new Error('nope'));
    vi.useFakeTimers();
    const { result } = renderBalance();

    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      await vi.waitFor(() => expect(result.current.error).toMatch(/too long/i));
    } finally {
      vi.useRealTimers();
    }
    expect(result.current.xlm).toBeNull();
    expect(result.current.formattedXlm).toBe('—');
    expect(result.current.isStale).toBe(false);
  });

  it('shows the loading placeholder while the balance loads, even once NFTs resolve', async () => {
    // Regression: isLoading required *both* queries to be pending. The NFT
    // source resolves almost immediately, so the placeholder never appeared
    // and users saw an em dash while Horizon was still in flight.
    let releaseBalance: (v: ReturnType<typeof snapshot>) => void = () => {};
    mockFetchBalance.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseBalance = resolve;
        })
    );
    const { result } = renderBalance();

    await waitFor(() => expect(result.current.nftCount).toBe(3));
    expect(result.current.xlm).toBeNull();
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      releaseBalance(snapshot(24.2453));
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.xlm).toBe(24.2453);
  });

  it('offers a retry when the balance fails, even though the NFT count loaded', async () => {
    // Regression: canRetry used to require both halves to be missing, so a
    // successful NFT read suppressed the retry for a failed balance.
    mockFetchBalance.mockRejectedValue(new WalletBalanceError('network', 'offline'));
    vi.useFakeTimers();
    const { result } = renderBalance();
    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      await vi.waitFor(() => expect(result.current.error).not.toBeNull());
    } finally {
      vi.useRealTimers();
    }

    expect(result.current.nftCount).toBe(3);
    expect(result.current.xlm).toBeNull();
    expect(result.current.canRetry).toBe(true);
    // Nothing was ever loaded for the balance, so it cannot be "stale".
    expect(result.current.isStale).toBe(false);
  });

  it('marks a previously loaded balance stale rather than offering a retry', async () => {
    const { result } = renderBalance();
    await waitFor(() => expect(result.current.xlm).toBe(24.2453));

    mockFetchBalance.mockRejectedValue(new WalletBalanceError('network', 'offline'));
    vi.useFakeTimers();
    try {
      await act(async () => {
        result.current.refresh();
        await vi.advanceTimersByTimeAsync(10_000);
      });
      await vi.waitFor(() => expect(result.current.isStale).toBe(true));
    } finally {
      vi.useRealTimers();
    }

    expect(result.current.xlm).toBe(24.2453);
    expect(result.current.canRetry).toBe(false);
  });

  it('still shows the balance when only the NFT count fails', async () => {
    mockFetchNfts.mockRejectedValue(new Error('indexer down'));
    vi.useFakeTimers();
    const { result } = renderBalance();

    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      await vi.waitFor(() => expect(result.current.xlm).toBe(24.2453));
      await vi.waitFor(() => expect(result.current.error).not.toBeNull());
    } finally {
      vi.useRealTimers();
    }
    // The headline balance still renders even though the NFT count could not load.
    expect(result.current.nftCount).toBeNull();
  });

  it('does not leak balances between wallets', async () => {
    const otherAddress = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
    const { wrapper } = createWrapper();
    const { result, rerender } = renderHook(
      ({ address }: { address: string }) => useWalletBalance({ address }),
      { wrapper, initialProps: { address: ADDRESS } }
    );

    await waitFor(() => expect(result.current.xlm).toBe(24.2453));

    mockFetchBalance.mockImplementation(async () => ({
      address: otherAddress,
      xlm: 7,
      tokens: [],
      unfunded: false,
      fetchedAt: Date.now(),
      optimistic: false,
    }));
    rerender({ address: otherAddress });

    // The previous wallet's balance must not carry over while the new one loads.
    expect(result.current.xlm).toBeNull();
    await waitFor(() => expect(result.current.xlm).toBe(7));
  });

  it('ignores optimistic updates when no wallet is connected', async () => {
    const { result } = renderBalance('');

    act(() => result.current.applyOptimisticDelta({ xlmDelta: -5 }));

    expect(result.current.xlm).toBeNull();
    expect(result.current.isOptimistic).toBe(false);
  });
});
