import { test, expect, Page } from "@playwright/test";
import { seedHuntData } from "./helpers/mock-wallet";

/**
 * Fixture hunts used across all tests.
 *
 * hunt 201 – Active, XLM  → visible under "Active" status + "XLM" reward filter
 * hunt 202 – Active, NFT  → hidden when "XLM" reward filter is selected
 * hunt 203 – Completed, XLM → visible only under "Completed" status filter
 */
const NOW = Math.floor(Date.now() / 1000);
const FIXTURE_HUNTS = [
  {
    id: 201,
    title: "Stellar Treasure Trail",
    description: "Hunt for XLM rewards across the city.",
    cluesCount: 3,
    status: "Active",
    rewardType: "XLM",
    rewardPool: 100,
    playerCount: 5,
    startTime: NOW - 86400,
    endTime: NOW + 7 * 86400,
  },
  {
    id: 202,
    title: "NFT Art Adventure",
    description: "Discover digital art pieces around town.",
    cluesCount: 5,
    status: "Active",
    rewardType: "NFT",
    rewardPool: 0,
    playerCount: 8,
    startTime: NOW - 2 * 86400,
    endTime: NOW + 3 * 86400,
  },
  {
    id: 203,
    title: "Historic District Quest",
    description: "Completed hunt through the historic district.",
    cluesCount: 4,
    status: "Completed",
    rewardType: "XLM",
    rewardPool: 50,
    playerCount: 20,
    startTime: NOW - 14 * 86400,
    endTime: NOW - 7 * 86400,
  },
];

/** Dismiss the OnboardingTour (react-joyride) overlay that blocks pointer events. */
async function dismissTour(page: Page) {
  const tourOverlay = page.locator("#react-joyride-portal");
  if (await tourOverlay.isVisible().catch(() => false)) {
    // Click the Skip button if available
    const skipBtn = page.getByRole("button", { name: /skip/i });
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click({ force: true });
    }
  }
}

/** Locator scoped to the Discovery Arcade results grid. */
function arcadeGrid(page: Page) {
  return page.locator('[data-testid="arcade-hunt-grid"]');
}

test.describe("Game Arcade — Search and Filter", () => {
  test.beforeEach(async ({ page }) => {
    // Pre-dismiss the onboarding tour so it never blocks clicks
    await page.addInitScript(() => {
      localStorage.setItem("hasSeenOnboardingTour", "true");
    });

    // Seed the hunt store with deterministic fixture data
    await seedHuntData(page, { hunts: FIXTURE_HUNTS, clues: [] });

    // Navigate to the arcade; default statusFilter is "Active"
    await page.goto("/");

    // Wait until the arcade grid or the no-results placeholder is rendered
    await page.waitForSelector(
      '[data-testid="arcade-hunt-grid"], [class*="border-dashed"]',
      { timeout: 15000 }
    );
  });

  // ── 1. Typing in the search bar filters hunt cards by title ────────────────
  test("typing in search bar filters hunt cards by title", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search title...");
    await expect(searchInput).toBeVisible();

    const grid = arcadeGrid(page);

    // Initially both active hunts should be visible in the arcade grid
    await expect(grid.getByText("Stellar Treasure Trail")).toBeVisible();
    await expect(grid.getByText("NFT Art Adventure")).toBeVisible();

    // Type a search query that matches only one hunt
    await searchInput.fill("Stellar");

    await expect(grid.getByText("Stellar Treasure Trail")).toBeVisible();
    await expect(grid.getByText("NFT Art Adventure")).not.toBeVisible();
  });

  // ── 2. Selecting "XLM" reward filter hides NFT-only hunts ─────────────────
  test("selecting XLM reward filter hides NFT-only hunts", async ({ page }) => {
    const grid = arcadeGrid(page);

    // Both active hunts visible by default
    await expect(grid.getByText("Stellar Treasure Trail")).toBeVisible();
    await expect(grid.getByText("NFT Art Adventure")).toBeVisible();

    // Click the XLM filter button (force bypasses any residual overlay)
    await page.getByRole("button", { name: "XLM" }).click({ force: true });

    await expect(grid.getByText("Stellar Treasure Trail")).toBeVisible();
    await expect(grid.getByText("NFT Art Adventure")).not.toBeVisible();
  });

  // ── 3. Selecting "Completed" status filter shows only completed hunts ──────
  test("selecting Completed status filter shows only completed hunts", async ({
    page,
  }) => {
    // "Completed" status renders as "Ended" label in the UI
    await page.getByRole("button", { name: "Ended" }).click({ force: true });

    const grid = arcadeGrid(page);
    await expect(grid.getByText("Historic District Quest")).toBeVisible();
    await expect(grid.getByText("Stellar Treasure Trail")).not.toBeVisible();
    await expect(grid.getByText("NFT Art Adventure")).not.toBeVisible();
  });

  // ── 4. Clearing the search shows all (active) hunts again ──────────────────
  test("clearing the search shows all hunts again", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search title...");
    const grid = arcadeGrid(page);

    // Filter down to one result
    await searchInput.fill("Stellar");
    await expect(grid.getByText("NFT Art Adventure")).not.toBeVisible();

    // Clear the search input
    await searchInput.clear();

    // Both active hunts should be visible again
    await expect(grid.getByText("Stellar Treasure Trail")).toBeVisible();
    await expect(grid.getByText("NFT Art Adventure")).toBeVisible();
  });

  // ── 5. Filter state persists within the session ────────────────────────────
  test("filter state persists within the session", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search title...");

    // Set a search query and reward filter
    await searchInput.fill("Stellar");
    await page.getByRole("button", { name: "XLM" }).click({ force: true });

    // Navigate away and come back
    await page.goto("/help");
    // Re-dismiss tour in case it shows on /help navigation back
    await page.addInitScript(() => {
      localStorage.setItem("hasSeenOnboardingTour", "true");
    });
    await page.goto("/");

    // Wait for grid to render
    await page.waitForSelector(
      '[data-testid="arcade-hunt-grid"], [class*="border-dashed"]',
      { timeout: 15000 }
    );

    // Filter state should be restored from sessionStorage
    const restoredSearch = page.getByPlaceholder("Search title...");
    await expect(restoredSearch).toHaveValue("Stellar");

    const grid = arcadeGrid(page);
    await expect(grid.getByText("NFT Art Adventure")).not.toBeVisible();
    await expect(grid.getByText("Stellar Treasure Trail")).toBeVisible();
  });
});
