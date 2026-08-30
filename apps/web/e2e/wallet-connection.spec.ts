import { expect, test } from '@playwright/test';

import {
  injectMockWallet,
  injectRejectedAccessWallet,
  injectWrongNetworkWallet,
  MOCK_MAINNET_PUBLIC_KEY,
  MOCK_PUBLIC_KEY,
  seedHuntData,
} from './helpers/mock-wallet';

test.describe('Wallet Connection', () => {
  test.beforeEach(async ({ page }) => {
    await seedHuntData(page);
  });

  test('shows Connect Wallet button when not connected', async ({ page }) => {
    await page.goto('/');
    const connectBtn = page.getByRole('button', { name: /connect wallet/i });
    await expect(connectBtn).toBeVisible();
  });

  test('opens wallet modal and shows Freighter option', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /connect wallet/i }).click();

    // The WalletModal should appear with the Freighter option
    await expect(page.getByText('Connect a wallet')).toBeVisible();
    await expect(page.getByRole('button', { name: /freighter/i })).toBeVisible();
  });

  test('displays shortened wallet address after connecting', async ({ page }) => {
    await injectMockWallet(page);
    await page.goto('/');

    // The mock wallet pre-seeds localStorage, so the Header should show
    // the shortened key instead of "Connect Wallet"
    const shortKey = `${MOCK_PUBLIC_KEY.slice(0, 6)}...${MOCK_PUBLIC_KEY.slice(-6)}`;
    await expect(page.getByText(shortKey)).toBeVisible({ timeout: 10_000 });
  });

  test('wallet dropdown shows address and disconnect option', async ({ page }) => {
    await injectMockWallet(page);
    await page.goto('/');

    // Click the wallet button to open the dropdown
    const shortKey = `${MOCK_PUBLIC_KEY.slice(0, 6)}...${MOCK_PUBLIC_KEY.slice(-6)}`;
    await page.getByText(shortKey).click();

    // Dropdown should show full address and disconnect button
    await expect(page.getByText('Connected wallet')).toBeVisible();
    await expect(page.getByText('Copy address')).toBeVisible();
    await expect(page.getByText('Disconnect wallet')).toBeVisible();
  });

  test('disconnects wallet and shows Connect Wallet button again', async ({ page }) => {
    await injectMockWallet(page);
    await page.goto('/');

    const shortKey = `${MOCK_PUBLIC_KEY.slice(0, 6)}...${MOCK_PUBLIC_KEY.slice(-6)}`;
    await page.getByText(shortKey).click();
    await page.getByText('Disconnect wallet').click();

    await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  // ── Reconnect after page refresh (Issue #901 / related #307) ───────────

  test('reconnects wallet after page refresh', async ({ page }) => {
    await injectMockWallet(page);
    await page.goto('/');

    const shortKey = `${MOCK_PUBLIC_KEY.slice(0, 6)}...${MOCK_PUBLIC_KEY.slice(-6)}`;
    await expect(page.getByText(shortKey)).toBeVisible({ timeout: 10_000 });

    // Simulate a full page reload — the mock addInitScript re-seeds
    // localStorage and the wallet state should be restored.
    await page.reload();

    // After reload the wallet session must still be active.
    // This guards against bugs like #307 (wallet address lost on refresh).
    await expect(page.getByText(shortKey)).toBeVisible({ timeout: 10_000 });

    // The wallet dropdown should also still work
    await page.getByText(shortKey).click();
    await expect(page.getByText('Disconnect wallet')).toBeVisible();
  });

  // ── Rejected signature / access denied path (Issue #901) ───────────────

  test('shows error when user rejects wallet access request', async ({ page }) => {
    // Inject a mock that reports Freighter as available but responds to
    // REQUEST_ACCESS with an error — simulating the user clicking "Deny".
    await injectRejectedAccessWallet(page);
    await page.goto('/');

    // Open the wallet modal
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await expect(page.getByText('Connect a wallet')).toBeVisible();

    // Click the Freighter button to trigger the access request
    const freighterBtn = page.getByRole('button', { name: /freighter/i });
    await expect(freighterBtn).toBeVisible();
    await freighterBtn.click();

    // The UI should surface the rejection error to the user.
    // Use a text-based locator so it works with both WalletModal and
    // WalletSelectionModal, regardless of which one the app renders.
    const errorMsg = page.locator('text=/rejected|denied|access/i').first();
    await expect(errorMsg).toBeVisible({ timeout: 10_000 });

    // The "Connect a wallet" title should still be visible — modal stays open
    // so the user can try again or pick a different wallet.
    await expect(page.getByText('Connect a wallet')).toBeVisible();
  });

  // ── Wrong network path (Issue #901) ────────────────────────────────────

  test('handles wallet connected to wrong network (mainnet)', async ({ page }) => {
    // Inject a mock that reports the wallet is on Stellar mainnet (PUBLIC)
    // while the app is configured for testnet.
    await injectWrongNetworkWallet(page);
    await page.goto('/');

    // The wallet still connects — the mock pre-seeds localStorage with a
    // mainnet-formatted address, so the header should show the shortened key.
    const shortKey = `${MOCK_MAINNET_PUBLIC_KEY.slice(0, 6)}...${MOCK_MAINNET_PUBLIC_KEY.slice(-6)}`;
    await expect(page.getByText(shortKey)).toBeVisible({ timeout: 10_000 });

    // The app should not crash or white-screen when the wallet reports a
    // different network. The connect-wallet button should NOT be visible
    // (the wallet IS connected, just on the wrong network).
    await expect(page.getByRole('button', { name: /connect wallet/i })).not.toBeVisible();

    // Verify the mock is correctly seeded with the mainnet key
    const storedKey = await page.evaluate(() => localStorage.getItem('freighter_public_key'));
    expect(storedKey).toBe(MOCK_MAINNET_PUBLIC_KEY);
  });
});
