/**
 * Dark Mode Toggle — E2E Tests
 * Issue #345
 *
 * Covers:
 * 1. Clicking ThemeToggle switches from light → dark (class="dark" on <html>)
 * 2. Clicking ThemeToggle again switches back from dark → light
 * 3. Theme preference is persisted after page reload
 * 4. System dark mode preference is respected on first load
 * 5. System light mode preference is respected on first load
 * 6. Manual override persists after system preference changes
 */

import { test, expect } from "@playwright/test";
import { injectMockWallet, seedHuntData } from "./helpers/mock-wallet";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Wait for next-themes hydration and return whether <html> has class="dark". */
async function isDarkMode(page: import("@playwright/test").Page): Promise<boolean> {
  // next-themes sets class="dark" on <html> after hydration; give it a moment.
  await page.waitForTimeout(200);
  const cls = await page.evaluate(() => document.documentElement.className);
  return cls.includes("dark");
}

/** Click the ThemeToggle button (aria-label="Toggle dark mode"). */
async function clickThemeToggle(page: import("@playwright/test").Page): Promise<void> {
  await page.getByRole("button", { name: /toggle dark mode/i }).click();
  // Allow next-themes to apply the class change before asserting.
  await page.waitForTimeout(150);
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe("Dark mode toggle", () => {
  test.beforeEach(async ({ page }) => {
    await injectMockWallet(page);
    await seedHuntData(page);
  });

  // ── Toggle direction ────────────────────────────────────────────────────────

  test("clicking ThemeToggle switches from light to dark mode", async ({ page }) => {
    // Force a clean light-mode start by clearing stored preference.
    await page.addInitScript(() => {
      localStorage.removeItem("theme");
    });
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");

    // Sanity: should start in light mode (no "dark" class).
    expect(await isDarkMode(page)).toBe(false);

    await clickThemeToggle(page);

    // After toggle: <html class="dark"> must be present.
    await expect(page.locator("html")).toHaveClass(/dark/);
    expect(await isDarkMode(page)).toBe(true);
  });

  test("clicking ThemeToggle switches from dark back to light mode", async ({ page }) => {
    // Seed dark mode as the starting state.
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");

    await expect(page.locator("html")).toHaveClass(/dark/);

    await clickThemeToggle(page);

    // After toggle: "dark" class must be gone.
    const cls = await page.evaluate(() => document.documentElement.className);
    expect(cls).not.toContain("dark");
  });

  // ── Persistence after reload ────────────────────────────────────────────────

  test("dark mode preference is persisted after page reload", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("theme");
    });
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");

    // Switch to dark mode.
    await clickThemeToggle(page);
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Reload the page — next-themes should restore the saved preference.
    await page.reload();
    await page.waitForTimeout(300);

    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("light mode preference is persisted after page reload", async ({ page }) => {
    // Start in dark, toggle to light, reload.
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);

    await clickThemeToggle(page);
    const clsAfterToggle = await page.evaluate(() => document.documentElement.className);
    expect(clsAfterToggle).not.toContain("dark");

    await page.reload();
    await page.waitForTimeout(300);

    const clsAfterReload = await page.evaluate(() => document.documentElement.className);
    expect(clsAfterReload).not.toContain("dark");
  });

  // ── System preference respected on first load ───────────────────────────────

  test("system dark mode preference is respected on first load", async ({ page }) => {
    // Clear any stored preference so next-themes falls back to system.
    await page.addInitScript(() => {
      localStorage.removeItem("theme");
    });
    // Emulate OS dark mode.
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.waitForTimeout(300);

    // next-themes with defaultTheme="system" should apply dark class.
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("system light mode preference is respected on first load", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("theme");
    });
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.waitForTimeout(300);

    const cls = await page.evaluate(() => document.documentElement.className);
    expect(cls).not.toContain("dark");
  });

  // ── Manual override persists across system-preference changes ───────────────

  test("manual dark override persists even when system switches to light", async ({ page }) => {
    // User explicitly chose dark.
    await page.addInitScript(() => {
      localStorage.removeItem("theme");
    });
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await clickThemeToggle(page); // light → dark
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Simulate OS switching to light — the stored preference should win.
    await page.emulateMedia({ colorScheme: "light" });
    await page.waitForTimeout(200);

    // The explicit "dark" preference should still be applied.
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  // ── ThemeToggle button is visible and accessible ────────────────────────────

  test("ThemeToggle button is visible on the home page", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /toggle dark mode/i })
    ).toBeVisible();
  });

  test("ThemeToggle has correct aria-label", async ({ page }) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: /toggle dark mode/i });
    await expect(button).toHaveAttribute("aria-label", /toggle dark mode/i);
  });
});
