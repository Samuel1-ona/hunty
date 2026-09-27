import { test, expect } from "@playwright/test";
import { injectMockWallet, seedHuntData } from "./helpers/mock-wallet";

test.describe("Dashboard & Hunt Management", () => {
  test.beforeEach(async ({ page }) => {
    await injectMockWallet(page);
    await seedHuntData(page);
  });

  test("navigates to dashboard from home page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /my hunts/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("My Hunts")).toBeVisible();
  });

  test("dashboard displays correct hunt status badges", async ({ page }) => {
    await page.goto("/dashboard");

    // Active hunt should have "Active" badge
    await expect(page.getByText("Active").first()).toBeVisible();
    // Draft hunt should have "Draft" badge
    await expect(page.getByText("Draft").first()).toBeVisible();
  });

  test("draft hunt shows Add Clues button", async ({ page }) => {
    await page.goto("/dashboard");

    // The "Draft Hunt" card should have an "Add Clues" button
    await expect(
      page.getByRole("button", { name: /add clues/i }).first()
    ).toBeVisible();
  });

  test("Add Clues modal opens and allows input", async ({ page }) => {
    await page.goto("/dashboard");

    // Click Add Clues on a draft hunt
    await page.getByRole("button", { name: /add clues/i }).first().click();

    // The clue modal should open with the hunt title in the heading
    await expect(page.getByRole("heading", { name: /add clues/i })).toBeVisible();
    await expect(
      page.getByPlaceholder("e.g. What has keys but no locks?")
    ).toBeVisible();

    // Fill in a clue
    await page
      .getByPlaceholder("e.g. What has keys but no locks?")
      .fill("What is 1+1?");
    await page.getByPlaceholder("keyboard").fill("2");

    // The Save Clues button should become enabled
    await expect(
      page.getByRole("button", { name: /save clues/i })
    ).toBeEnabled();
  });

  test("active hunt shows Leaderboard button", async ({ page }) => {
    await page.goto("/dashboard");

    // Active hunts should have a Leaderboard button
    await expect(
      page.getByRole("button", { name: /leaderboard/i }).first()
    ).toBeVisible();
  });

  test("back navigation returns to home page", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", { name: /game arcade/i }).click();
    await expect(page).toHaveURL("/");
  });
});
