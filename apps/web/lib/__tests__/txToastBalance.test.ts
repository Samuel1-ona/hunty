/**
 * Covers the wiring between the transaction lifecycle and the wallet balance:
 * every transaction outcome must reconcile any optimistic balance, otherwise a
 * predicted spend can linger on screen for a payment that never landed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  },
}));
vi.mock('@/components/SrAnnouncer', () => ({ announceSr: vi.fn() }));
vi.mock('@/lib/contracts/errors', () => ({
  mapContractError: (error: unknown) => ({
    message: error instanceof Error ? error.message : 'failed',
    isUserRejection: false,
  }),
}));

import { withTransactionToast } from '@/lib/txToast';
import {
  resetWalletBalanceListeners,
  subscribeToWalletBalanceEvents,
} from '@/lib/wallet/balanceEvents';

let events: string[];

beforeEach(() => {
  events = [];
  resetWalletBalanceListeners();
  subscribeToWalletBalanceEvents((event) => events.push(event.type));
});

afterEach(() => {
  resetWalletBalanceListeners();
  vi.clearAllMocks();
});

describe('withTransactionToast → wallet balance', () => {
  it('settles the balance after a confirmed transaction', async () => {
    const result = await withTransactionToast(async () => 'ok');

    expect(result).toBe('ok');
    expect(events).toEqual(['settled']);
  });

  it('settles the balance after a failed transaction so a prediction is not left standing', async () => {
    await expect(
      withTransactionToast(async () => {
        throw new Error('contract reverted');
      })
    ).rejects.toThrow('contract reverted');

    expect(events).toEqual(['settled']);
  });

  it('still re-throws so callers can run their own cleanup', async () => {
    const cleanup = vi.fn();

    await withTransactionToast(async () => {
      throw new Error('boom');
    }).catch(cleanup);

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(events).toEqual(['settled']);
  });
});
