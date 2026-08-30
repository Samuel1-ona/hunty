import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/hooks/useWalletBalance', () => ({ useWalletBalance: vi.fn() }));

import { useWalletBalance } from '@/hooks/useWalletBalance';
import { WalletBalance } from '@/components/WalletBalance';

const mockUseWalletBalance = vi.mocked(useWalletBalance);

const ADDRESS = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37';

const refresh = vi.fn();

function state(overrides: Partial<ReturnType<typeof useWalletBalance>> = {}) {
  return {
    address: ADDRESS,
    xlm: 24.2453,
    formattedXlm: '24.2453',
    tokens: [],
    nftCount: 3,
    unfunded: false,
    isLoading: false,
    isRefreshing: false,
    isOptimistic: false,
    error: null,
    isStale: false,
    canRetry: false,
    lastUpdated: Date.now(),
    refresh,
    applyOptimisticDelta: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useWalletBalance>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseWalletBalance.mockReturnValue(state());
});

describe('WalletBalance', () => {
  it('renders the XLM balance and NFT count', () => {
    render(<WalletBalance />);

    expect(screen.getByTestId('wallet-balance-xlm')).toHaveTextContent('24.2453');
    expect(screen.getByTestId('wallet-balance-nfts')).toHaveTextContent('3');
    expect(screen.getByText('XLM')).toBeInTheDocument();
  });

  it('exposes the balance to assistive technology as a live region', () => {
    render(<WalletBalance />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAccessibleName(
      expect.stringContaining('24.2453 XLM') as unknown as string
    );
  });

  it('renders nothing when no wallet is connected', () => {
    mockUseWalletBalance.mockReturnValue(state({ address: '', xlm: null, nftCount: null }));

    const { container } = render(<WalletBalance />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows a loading placeholder instead of a misleading zero', () => {
    mockUseWalletBalance.mockReturnValue(
      state({ isLoading: true, xlm: null, nftCount: null, formattedXlm: '—' })
    );

    render(<WalletBalance />);

    expect(screen.getByRole('status')).toHaveAccessibleName('Loading wallet balance');
    expect(screen.queryByTestId('wallet-balance-xlm')).not.toBeInTheDocument();
  });

  it('marks an unconfirmed optimistic value as pending', () => {
    mockUseWalletBalance.mockReturnValue(state({ isOptimistic: true, formattedXlm: '20.0000' }));

    render(<WalletBalance />);

    expect(screen.getByTestId('wallet-balance-xlm')).toHaveTextContent('20.0000');
    expect(screen.getByRole('status')).toHaveAccessibleName(
      expect.stringContaining('pending confirmation') as unknown as string
    );
  });

  it('keeps a stale value on screen with a warning rather than blanking it', () => {
    mockUseWalletBalance.mockReturnValue(
      state({ isStale: true, error: "Can't reach the Stellar network." })
    );

    render(<WalletBalance />);

    expect(screen.getByTestId('wallet-balance-xlm')).toHaveTextContent('24.2453');
    expect(screen.getByTestId('wallet-balance-stale')).toHaveAttribute(
      'title',
      "Can't reach the Stellar network."
    );
  });

  it('offers a retry when nothing could be loaded at all', async () => {
    const user = userEvent.setup();
    mockUseWalletBalance.mockReturnValue(
      state({
        xlm: null,
        nftCount: null,
        formattedXlm: '—',
        error: "Can't reach the Stellar network.",
        isStale: false,
        canRetry: true,
      })
    );

    render(<WalletBalance />);

    expect(screen.getByTestId('wallet-balance-xlm')).toHaveTextContent('—');
    const retry = screen.getByRole('button', { name: /retry loading balance/i });
    await user.click(retry);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('still offers a retry when the balance failed but the NFT count loaded', () => {
    // Regression: the retry used to require *both* values to be missing, so a
    // successful NFT read hid the only escape hatch from a failed balance.
    mockUseWalletBalance.mockReturnValue(
      state({
        xlm: null,
        formattedXlm: '—',
        nftCount: 3,
        error: "Can't reach the Stellar network.",
        isStale: false,
        canRetry: true,
      })
    );

    render(<WalletBalance />);

    expect(screen.getByRole('button', { name: /retry loading balance/i })).toBeInTheDocument();
    // The NFT count is real data and stays on screen.
    expect(screen.getByTestId('wallet-balance-nfts')).toHaveTextContent('3');
  });

  it('does not claim a never-loaded balance is out of date', () => {
    // Regression: isStale was true whenever *any* query had data, so a loaded
    // NFT count made an absent balance render as "may be out of date".
    mockUseWalletBalance.mockReturnValue(
      state({
        xlm: null,
        formattedXlm: '—',
        nftCount: 3,
        error: "Can't reach the Stellar network.",
        isStale: false,
        canRetry: true,
      })
    );

    render(<WalletBalance />);

    expect(screen.queryByTestId('wallet-balance-stale')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).not.toHaveAccessibleName(
      expect.stringContaining('out of date') as unknown as string
    );
  });

  it('labels an account that has never been funded', () => {
    mockUseWalletBalance.mockReturnValue(
      state({ xlm: 0, formattedXlm: '0.00', unfunded: true, nftCount: 0 })
    );

    render(<WalletBalance />);

    expect(screen.getByTestId('wallet-balance-xlm')).toHaveTextContent('0.00');
    expect(screen.getByText('unfunded')).toBeInTheDocument();
  });

  it('omits the NFT segment when the count is unknown', () => {
    mockUseWalletBalance.mockReturnValue(state({ nftCount: null }));

    render(<WalletBalance />);

    expect(screen.queryByTestId('wallet-balance-nfts')).not.toBeInTheDocument();
    expect(screen.getByTestId('wallet-balance-xlm')).toBeInTheDocument();
  });

  it('forwards the id the onboarding tour anchors to', () => {
    const { container } = render(<WalletBalance id="balance-pill" />);

    expect(container.querySelector('#balance-pill')).not.toBeNull();
  });

  it('lists token balances when asked to', () => {
    mockUseWalletBalance.mockReturnValue(
      state({
        tokens: [
          { assetCode: 'HUNTYPOINTS', assetIssuer: 'GISSUER1', balance: 250 },
          { assetCode: 'USDC', assetIssuer: 'GISSUER2', balance: 10 },
        ],
      })
    );

    render(<WalletBalance variant="row" showTokens />);

    const tokenList = screen.getByTestId('wallet-balance-tokens');
    expect(tokenList).toHaveTextContent('HUNTYPOINTS');
    expect(tokenList).toHaveTextContent('250.00');
    expect(tokenList).toHaveTextContent('USDC');
    expect(tokenList).toHaveTextContent('10.00');
  });

  it('keeps tokens out of the compact header chip', () => {
    mockUseWalletBalance.mockReturnValue(
      state({ tokens: [{ assetCode: 'USDC', assetIssuer: 'GISSUER', balance: 10 }] })
    );

    render(<WalletBalance />);

    expect(screen.queryByTestId('wallet-balance-tokens')).not.toBeInTheDocument();
    expect(screen.getByTestId('wallet-balance-xlm')).toBeInTheDocument();
  });

  it('announces token balances alongside XLM', () => {
    mockUseWalletBalance.mockReturnValue(
      state({ tokens: [{ assetCode: 'USDC', assetIssuer: 'GISSUER', balance: 10 }] })
    );

    render(<WalletBalance variant="row" showTokens />);

    expect(screen.getByRole('status')).toHaveAccessibleName(
      expect.stringContaining('10 USDC') as unknown as string
    );
  });

  it('distinguishes two tokens sharing an asset code from different issuers', () => {
    mockUseWalletBalance.mockReturnValue(
      state({
        tokens: [
          { assetCode: 'USDC', assetIssuer: 'GISSUER1', balance: 10 },
          { assetCode: 'USDC', assetIssuer: 'GISSUER2', balance: 5 },
        ],
      })
    );

    render(<WalletBalance variant="row" showTokens />);

    expect(screen.getByTestId('wallet-balance-tokens').querySelectorAll('li')).toHaveLength(2);
  });

  it('singularises the NFT label for a single token', () => {
    mockUseWalletBalance.mockReturnValue(state({ nftCount: 1 }));

    render(<WalletBalance />);

    expect(screen.getByTestId('wallet-balance-nfts')).toHaveAttribute('title', '1 NFT owned');
  });
});
