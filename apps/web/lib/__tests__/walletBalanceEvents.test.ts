import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  predictWalletBalanceChange,
  resetWalletBalanceListeners,
  settleWalletBalance,
  subscribeToWalletBalanceEvents,
} from '@/lib/wallet/balanceEvents';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

afterEach(() => {
  resetWalletBalanceListeners();
  vi.clearAllMocks();
});

describe('wallet balance events', () => {
  it('delivers optimistic deltas to subscribers', () => {
    const listener = vi.fn();
    subscribeToWalletBalanceEvents(listener);

    predictWalletBalanceChange({ xlmDelta: -2.5, nftDelta: 1 });

    expect(listener).toHaveBeenCalledWith({ type: 'optimistic', xlmDelta: -2.5, nftDelta: 1 });
  });

  it('defaults the delta the caller omits to zero', () => {
    const listener = vi.fn();
    subscribeToWalletBalanceEvents(listener);

    predictWalletBalanceChange({ xlmDelta: -1 });

    expect(listener).toHaveBeenCalledWith({ type: 'optimistic', xlmDelta: -1, nftDelta: 0 });
  });

  it('ignores a no-op delta', () => {
    const listener = vi.fn();
    subscribeToWalletBalanceEvents(listener);

    predictWalletBalanceChange({ xlmDelta: 0, nftDelta: 0 });
    predictWalletBalanceChange({});

    expect(listener).not.toHaveBeenCalled();
  });

  it('delivers settle events', () => {
    const listener = vi.fn();
    subscribeToWalletBalanceEvents(listener);

    settleWalletBalance();

    expect(listener).toHaveBeenCalledWith({ type: 'settled' });
  });

  it('fans out to every subscriber', () => {
    const first = vi.fn();
    const second = vi.fn();
    subscribeToWalletBalanceEvents(first);
    subscribeToWalletBalanceEvents(second);

    settleWalletBalance();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops delivering after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToWalletBalanceEvents(listener);

    unsubscribe();
    settleWalletBalance();

    expect(listener).not.toHaveBeenCalled();
  });

  it('isolates a throwing subscriber from the others and from the caller', () => {
    const exploding = vi.fn(() => {
      throw new Error('listener blew up');
    });
    const healthy = vi.fn();
    subscribeToWalletBalanceEvents(exploding);
    subscribeToWalletBalanceEvents(healthy);

    expect(() => settleWalletBalance()).not.toThrow();
    expect(healthy).toHaveBeenCalledTimes(1);
  });
});
