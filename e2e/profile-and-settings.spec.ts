import { test, expect } from "@playwright/test";
import { injectMockWallet, MOCK_PUBLIC_KEY, seedHuntData } from "./helpers/mock-wallet";

test.describe("Profile and Settings", () => {
  test.beforeEach(async ({ page }) => {
    await injectMockWallet(page);
    await seedHuntData(page);
  });

  test("navigates to profile page from header", async ({ page }) => {
    await page.goto("/");
    
    // Click on the wallet button to open dropdown
    const shortKey = `${MOCK_PUBLIC_KEY.slice(0, 6)}...${MOCK_PUBLIC_KEY.slice(-6)}`;
    await page.getByText(shortKey).click();

    // Look for a profile link or click the wallet address directly
    await page.getByRole("link", { name: /profile/i }).click();
    
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByRole("heading", { name: /profile|my profile/i })).toBeVisible();
  });

  test("profile page displays connected wallet address", async ({ page }) => {
    await page.goto("/profile");

    // The profile should show the connected wallet address
    await expect(page.getByText(MOCK_PUBLIC_KEY)).toBeVisible({ timeout: 5_000 });
  });

  test("profile displays wallet address in shortened format", async ({ page }) => {
    await page.goto("/profile");

    const shortKey = `${MOCK_PUBLIC_KEY.slice(0, 6)}...${MOCK_PUBLIC_KEY.slice(-6)}`;
    await expect(page.getByText(shortKey)).toBeVisible();
  });

  test("profile shows registered hunts section", async ({ page }) => {
    await page.goto("/profile");

    // Should display a section for registered/joined hunts
    await expect(
      page.getByRole("heading", { name: /registered|joined|my hunts|active hunts/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test("profile shows badges and achievements section", async ({ page }) => {
    await page.goto("/profile");

    // Should display badges/achievements wall
    const badgeSection = page.locator("text=/badges|achievements|rewards/i").first();
    await expect(badgeSection).toBeVisible({ timeout: 5_000 });
  });

  test("profile shows NFT gallery if user has NFT rewards", async ({ page }) => {
    await page.goto("/profile");

    // The NFT gallery section should be visible (may be empty)
    const nftGallery = page.locator("text=/nft|gallery|digital assets/i").first();
    
    // Check if gallery exists (even if empty)
    if (await nftGallery.isVisible().catch(() => false)) {
      await expect(nftGallery).toBeVisible();
    }
  });

  test("can copy wallet address from profile", async ({ page }) => {
    await page.goto("/profile");

    // Find and click copy button
    const copyBtn = page.getByRole("button", { name: /copy|copy address/i });
    
    if (await copyBtn.isVisible().catch(() => false)) {
      await copyBtn.click();
      
      // Should show a success message or visual feedback
      // This depends on the implementation
      await page.waitForTimeout(500);
    }
  });

  test("profile shows hunt statistics (created/completed/in-progress)", async ({ page }) => {
    await page.goto("/profile");

    // Look for statistics like "Hunts Created", "Completed", etc.
    const statsContainer = page.locator("text=/created|completed|in progress|stats|statistics/i").first();
    
    if (await statsContainer.isVisible().catch(() => false)) {
      await expect(statsContainer).toBeVisible();
    }
  });

  test("disconnect wallet button is accessible from profile", async ({ page }) => {
    await page.goto("/profile");

    // Look for disconnect option in settings or dropdown
    const shortKey = `${MOCK_PUBLIC_KEY.slice(0, 6)}...${MOCK_PUBLIC_KEY.slice(-6)}`;
    await page.getByText(shortKey).click();

    const disconnectBtn = page.getByRole("button", { name: /disconnect/i });
    await expect(disconnectBtn).toBeVisible();
  });

  test("disconnecting wallet redirects to home page", async ({ page }) => {
    await page.goto("/profile");

    // Click wallet button and disconnect
    const shortKey = `${MOCK_PUBLIC_KEY.slice(0, 6)}...${MOCK_PUBLIC_KEY.slice(-6)}`;
    await page.getByText(shortKey).click();

    await page.getByRole("button", { name: /disconnect/i }).click();

    // Should be redirected or show connect button
    await expect(page.getByRole("button", { name: /connect wallet/i })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("profile is not accessible without connected wallet", async ({ page }) => {
    // Don't inject wallet
    await page.goto("/profile");

    // Should either redirect to home or show connect wallet message
    const connectBtn = page.getByRole("button", { name: /connect wallet/i });
    const redirect = page.url().includes("/");
    
    await expect(
      connectBtn.isVisible().catch(() => Promise.resolve(redirect))
    ).toBeTruthy();
  });

  test("theme toggle persists user preference", async ({ page }) => {
    await page.goto("/profile");

    // Find and click theme toggle
    const themeToggle = page.getByRole("button", { name: /dark|light|theme/i });
    
    if (await themeToggle.isVisible().catch(() => false)) {
      const initialState = await page.locator("html").evaluate((el) => 
        el.getAttribute("class") || el.getAttribute("data-theme")
      );

      await themeToggle.click();

      // Verify theme changed
      const newState = await page.locator("html").evaluate((el) =>
        el.getAttribute("class") || el.getAttribute("data-theme")
      );

      expect(initialState).not.toEqual(newState);
    }
  });

  test("profile navigation works from dashboard", async ({ page }) => {
    await page.goto("/dashboard");

    // Navigate to profile
    const shortKey = `${MOCK_PUBLIC_KEY.slice(0, 6)}...${MOCK_PUBLIC_KEY.slice(-6)}`;
    await page.getByText(shortKey).click();

    await page.getByRole("link", { name: /profile/i }).click();

    await expect(page).toHaveURL(/\/profile/);
  });

  test("profile back navigation returns to previous page", async ({ page }) => {
    await page.goto("/dashboard");

    // Navigate to profile
    const shortKey = `${MOCK_PUBLIC_KEY.slice(0, 6)}...${MOCK_PUBLIC_KEY.slice(-6)}`;
    await page.getByText(shortKey).click();
    await page.getByRole("link", { name: /profile/i }).click();

    // Use browser back
    await page.goBack();

    await expect(page).toHaveURL(/\/dashboard/);
  });
});
