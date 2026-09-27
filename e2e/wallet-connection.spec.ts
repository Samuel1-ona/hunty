import { test, expect } from "@playwright/test";
import {
  injectMockWallet,
  MOCK_PUBLIC_KEY,
  seedHuntData,
} from "./helpers/mock-wallet";

test.describe("Wallet Connection", () => {
  test.beforeEach(async ({ page }) => {
    await seedHuntData(page);
  });

  test("shows Connect Wallet button when not connected", async ({ page }) => {
    await page.goto("/");
    const connectBtn = page.getByRole("button", { name: /connect wallet/i });
    await expect(connectBtn).toBeVisible();
  });

  test("opens wallet modal and shows Freighter option", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /connect wallet/i }).click();

    // The WalletModal should appear with the Freighter option
    await expect(page.getByText("Connect a wallet")).toBeVisible();
    await expect(page.getByRole("button", { name: /freighter/i })).toBeVisible();
  });

  test("displays shortened wallet address after connecting", async ({
    page,
  }) => {
    await injectMockWallet(page);
    await page.goto("/");

    // The mock wallet pre-seeds localStorage, so the Header should show
    // the shortened key instead of "Connect Wallet"
    const shortKey = `${MOCK_PUBLIC_KEY.slice(0, 6)}...${MOCK_PUBLIC_KEY.slice(-6)}`;
    await expect(page.getByText(shortKey)).toBeVisible({ timeout: 10_000 });
  });

  test("wallet dropdown shows address and disconnect option", async ({
    page,
  }) => {
    await injectMockWallet(page);
    await page.goto("/");

    // Click the wallet button to open the dropdown
    const shortKey = `${MOCK_PUBLIC_KEY.slice(0, 6)}...${MOCK_PUBLIC_KEY.slice(-6)}`;
    await page.getByText(shortKey).click();

    // Dropdown should show full address and disconnect button
    await expect(page.getByText("Connected wallet")).toBeVisible();
    await expect(page.getByText("Copy address")).toBeVisible();
    await expect(page.getByText("Disconnect wallet")).toBeVisible();
  });

  test("disconnects wallet and shows Connect Wallet button again", async ({
    page,
  }) => {
    await injectMockWallet(page);
    await page.goto("/");

    const shortKey = `${MOCK_PUBLIC_KEY.slice(0, 6)}...${MOCK_PUBLIC_KEY.slice(-6)}`;
    await page.getByText(shortKey).click();
    await page.getByText("Disconnect wallet").click();

    await expect(
      page.getByRole("button", { name: /connect wallet/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});
