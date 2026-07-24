import { test, expect } from "@playwright/test";
import { seedHuntData } from "./helpers/mock-wallet";

test.describe("WalletModal focus trap", () => {
  test.beforeEach(async ({ page }) => {
    await seedHuntData(page);
    await page.goto("/");
    await page.getByRole("button", { name: /connect wallet/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("Tab key keeps focus inside the modal", async ({ page }) => {
    const dialog = page.getByRole("dialog");

    // Tab through all focusable elements several times and verify focus stays inside
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      const focusedInsideDialog = await dialog.evaluate((el) =>
        el.contains(document.activeElement)
      );
      expect(focusedInsideDialog).toBe(true);
    }
  });

  test("Escape closes the modal", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
