import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { toast } from 'sonner';

import {
  cancelPendingTransactions,
  getDisconnectGeneration,
  withTransactionToast,
} from '@/lib/txToast';
import {
  resetWalletBalanceListeners,
  subscribeToWalletBalanceEvents,
} from '@/lib/wallet/balanceEvents';

describe('cancelPendingTransactions', () => {
  beforeEach(() => {
    resetWalletBalanceListeners();
    vi.clearAllMocks();
  });

  it('dismisses pending toasts and settles wallet balance', async () => {
    const events: string[] = [];
    subscribeToWalletBalanceEvents((event) => events.push(event.type));

    let resolveTx!: (value: string) => void;
    const txPromise = withTransactionToast(
      () =>
        new Promise<string>((resolve) => {
          resolveTx = resolve;
        })
    );

    expect(toast.loading).toHaveBeenCalled();
    const generationBefore = getDisconnectGeneration();

    cancelPendingTransactions();

    expect(toast.dismiss).toHaveBeenCalled();
    expect(getDisconnectGeneration()).toBe(generationBefore + 1);
    expect(events).toContain('settled');

    resolveTx('ok');
    await expect(txPromise).resolves.toBe('ok');

    // Success toast must not fire after disconnect cancelled the pending stage.
    expect(toast.success).not.toHaveBeenCalled();
  });
});
