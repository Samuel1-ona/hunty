import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/usePaymasterBudget', () => ({ usePaymasterBudget: vi.fn() }));

import { GasSponsorshipIndicator } from '@/components/GasSponsorshipIndicator';
import { usePaymasterBudget } from '@/hooks/usePaymasterBudget';

const mockUsePaymasterBudget = vi.mocked(usePaymasterBudget);

const ADDRESS = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37';

function state(overrides: Partial<ReturnType<typeof usePaymasterBudget>> = {}) {
  return {
    address: ADDRESS,
    usedTx: 1,
    maxTx: 3,
    usedBudget: 100_000,
    maxBudget: 10_000_000,
    isSponsored: true,
    remainingTx: 2,
    remainingBudget: 9_900_000,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    ...overrides,
  } as ReturnType<typeof usePaymasterBudget>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUsePaymasterBudget.mockReturnValue(state());
});

describe('GasSponsorshipIndicator', () => {
  it('renders nothing when no wallet is connected', () => {
    mockUsePaymasterBudget.mockReturnValue(state({ address: '' }));

    const { container } = render(<GasSponsorshipIndicator />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows a loading placeholder while the budget is fetching', () => {
    mockUsePaymasterBudget.mockReturnValue(state({ isLoading: true, isSponsored: false }));

    render(<GasSponsorshipIndicator />);

    expect(screen.getByRole('status')).toHaveAccessibleName(/checking/i);
  });

  it('states the next action is sponsored', () => {
    mockUsePaymasterBudget.mockReturnValue(state({ remainingTx: 3, remainingBudget: 10_000_000 }));

    render(<GasSponsorshipIndicator />);

    const el = screen.getByTestId('gas-sponsorship-indicator');
    expect(el).toHaveAttribute('data-sponsored', 'true');
    expect(screen.getByText('Sponsored')).toBeInTheDocument();
  });

  it('surfaces remaining budget once the sponsored transaction count is low', () => {
    mockUsePaymasterBudget.mockReturnValue(state({ remainingTx: 1, remainingBudget: 500_000 }));

    render(<GasSponsorshipIndicator />);

    expect(screen.getByText(/1 left/i)).toBeInTheDocument();
  });

  it('surfaces remaining budget when the budget itself is running low, even with tx left', () => {
    mockUsePaymasterBudget.mockReturnValue(
      state({ remainingTx: 3, maxTx: 3, remainingBudget: 500_000, maxBudget: 10_000_000 })
    );

    render(<GasSponsorshipIndicator />);

    expect(screen.getByText(/3 left/i)).toBeInTheDocument();
  });

  it('does not surface remaining counts when comfortably within budget', () => {
    mockUsePaymasterBudget.mockReturnValue(
      state({ remainingTx: 3, maxTx: 3, remainingBudget: 10_000_000, maxBudget: 10_000_000 })
    );

    render(<GasSponsorshipIndicator />);

    expect(screen.queryByText(/left/i)).not.toBeInTheDocument();
  });

  it("falls back gracefully to a 'you'll pay network fees' message when not eligible", () => {
    mockUsePaymasterBudget.mockReturnValue(
      state({ isSponsored: false, remainingTx: 0, remainingBudget: 0 })
    );

    render(<GasSponsorshipIndicator />);

    const el = screen.getByTestId('gas-sponsorship-indicator');
    expect(el).toHaveAttribute('data-sponsored', 'false');
    expect(screen.getByText(/pay network fees/i)).toBeInTheDocument();
  });

  it("falls back to the same 'you'll pay' message on a fetch error, never claiming sponsorship", () => {
    mockUsePaymasterBudget.mockReturnValue(
      state({ isSponsored: false, error: 'offline', remainingTx: null, remainingBudget: null })
    );

    render(<GasSponsorshipIndicator />);

    expect(screen.getByText(/pay network fees/i)).toBeInTheDocument();
  });
});
