import { test, expect } from '@playwright/test';
import { MOCK_PUBLIC_KEY } from './helpers/mock-wallet';

/**
 * E2E test for the Reward Claim flow.
 * 
 * Bypasses registration and gameplay to test the "Claim Prize" button specifically.
 */
test.describe('Reward Claim Flow', () => {
  test('should allow a player to claim a reward for a completed hunt', async ({ page }) => {
    const address = MOCK_PUBLIC_KEY;
    
    // Pre-seed everything: wallet, registration, and completion
    await page.addInitScript(({ addr }) => {
      localStorage.setItem('freighter_public_key', addr);
      localStorage.setItem(`hunt_registered_1_${addr}`, 'true');
      localStorage.setItem('hunt_completed_1', 'true');
      
      // Minimal mock wallet for the share page logic
      const mockWallet = {
        isConnected: true,
        getPublicKey: () => Promise.resolve(addr),
        request: ({ method }: { method: string }) => {
          if (method === "getPublicKey") return Promise.resolve(addr);
          return Promise.resolve(null);
        },
      };
      (window as any).freighter = mockWallet;
      (window as any).soroban = mockWallet;
      (window as any).sorobanWallet = mockWallet;
    }, { addr: address });

    // 1. Visit hunt page (ID 1)
    await page.goto('/hunt/1');
    
    // 2. Verify wallet connection
    const shortKey = `${address.slice(0, 6)}...${address.slice(-6)}`;
    await expect(page.getByText(shortKey)).toBeVisible({ timeout: 15000 });
    
    // 3. Verify "Claim Prize" button is visible
    // Since we are registered and the hunt is completed, one of these should happen:
    // - Modal appears (if we trigger it on mount)
    // - RewardsPanel is visible on page
    const claimButton = page.getByRole('button', { name: /Claim Prize/i });
    await expect(claimButton).toBeVisible({ timeout: 20000 });
    
    // 4. Click Claim Prize
    await claimButton.click();
    
    // 5. Verify status change to "Claimed"
    await expect(page.getByRole('button', { name: /Claimed/i })).toBeVisible({ timeout: 10000 });
    
    // 6. Verify localStorage persistence
    const isClaimed = await page.evaluate((addr) => {
      return localStorage.getItem(`hunt_reward_claimed_1_${addr}`) === 'true' || 
             localStorage.getItem('hunt_reward_claimed_1') === 'true';
    }, address);
    expect(isClaimed).toBe(true);
  });
});
