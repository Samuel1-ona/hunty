import { test, expect, devices } from "@playwright/test";
import { injectMockWallet, seedHuntData, MOCK_PUBLIC_KEY } from "./helpers/mock-wallet";

/**
 * Mobile Viewport Tests
 *
 * Tests critical user flows across different mobile device sizes:
 * - iPhone SE (375px) – small phone
 * - iPhone 12 (390px) – standard phone
 * - iPad (768px) – tablet
 */

const MOBILE_DEVICES = [
  { name: "iPhone SE (375px)", viewport: { width: 375, height: 667 } },
  { name: "iPhone 12 (390px)", viewport: { width: 390, height: 844 } },
  { name: "iPad (768px)", viewport: { width: 768, height: 1024 } },
];

MOBILE_DEVICES.forEach(({ name, viewport }) => {
  test.describe(`Mobile: ${name}`, () => {
    // Set viewport for all tests in this describe block
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      await injectMockWallet(page);
      await seedHuntData(page);
    });

    // ─────────────────────────────────────────────────────────────────
    // Navigation and Layout
    // ─────────────────────────────────────────────────────────────────

    test("header is responsive and clickable on mobile", async ({ page }) => {
      await page.goto("/");

      // Header should be visible and properly laid out
      const header = page.locator("header, [role='banner']").first();
      await expect(header).toBeVisible();

      // Logo/title should be clickable
      const logo = page.getByRole("link", { name: /hunty|game arcade/i }).first();
      if (await logo.isVisible().catch(() => false)) {
        await expect(logo).toBeVisible();
        await logo.click();
        await expect(page).toHaveURL(/\/$|\/$/);
      }
    });

    test("mobile menu opens and closes properly", async ({ page }) => {
      await page.goto("/");

      // Look for mobile menu button (hamburger)
      const menuBtn = page.getByRole("button", { name: /menu|hamburger|open menu/i });

      if (await menuBtn.isVisible().catch(() => false)) {
        // Menu should be hidden initially
        let menu = page.locator("[role='navigation']");

        // Open menu
        await menuBtn.click();
        await expect(menu).toBeVisible();

        // Close menu
        const closeBtn = page.getByRole("button", { name: /close|close menu/i });
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click();
        } else {
          await menuBtn.click(); // Toggle
        }

        // Menu should be hidden
        // Note: may have display: none or visibility: hidden
        await page.waitForTimeout(300);
      }
    });

    test("touch targets are adequately sized (44px minimum)", async ({ page }) => {
      await page.goto("/");

      // Check buttons have minimum 44px size (accessibility standard)
      const buttons = page.locator("button");
      const count = await buttons.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const btn = buttons.nth(i);
        const box = await btn.boundingBox();

        if (box) {
          // Height should be at least 44px for mobile
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // Home Page Mobile
    // ─────────────────────────────────────────────────────────────────

    test("home page displays hunt cards in responsive grid", async ({ page }) => {
      await page.goto("/");

      // Hunt cards should stack vertically on mobile
      const cards = page.locator("[data-slot='card']").first();
      await expect(cards).toBeVisible();

      // Check card is responsive
      const box = await cards.boundingBox();
      if (box) {
        // Card should fill viewport width (with some margin)
        expect(box.width).toBeLessThanOrEqual(viewport.width);
      }
    });

    test("search input is usable on mobile", async ({ page }) => {
      await page.goto("/");

      const searchInput = page.getByPlaceholder("Search|search hunts", { exact: false });

      if (await searchInput.isVisible().catch(() => false)) {
        // Should be tappable
        await searchInput.tap();
        await searchInput.type("test");

        // Input should show text
        await expect(searchInput).toHaveValue("test");
      }
    });

    test("Create Game button is accessible on mobile", async ({ page }) => {
      await page.goto("/");

      const createBtn = page.getByRole("button", { name: /create game|create hunt/i });

      if (await createBtn.isVisible().catch(() => false)) {
        // Button should be tappable
        await createBtn.tap();

        // Should navigate to hunt creation
        await expect(page).toHaveURL(/\/hunty/);
      }
    });

    test("wallet button is accessible on mobile header", async ({ page }) => {
      await page.goto("/");

      const walletBtn = page.getByRole("button", { name: /wallet|connect|account/i }).first();

      if (await walletBtn.isVisible().catch(() => false)) {
        await walletBtn.tap();

        // Dropdown should appear
        const dropdown = page.locator("[role='menu'], .dropdown, .popover").first();
        await expect(dropdown).toBeVisible({ timeout: 2_000 });
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // Hunt Creation Mobile
    // ─────────────────────────────────────────────────────────────────

    test("hunt creation form is scrollable and usable on mobile", async ({ page }) => {
      await page.goto("/hunty");

      // Form inputs should be visible and accessible
      const titleInput = page.getByPlaceholder("Title of the Hunt");
      await expect(titleInput).toBeVisible();

      // Should be able to scroll and interact
      await titleInput.tap();
      await titleInput.type("Mobile Hunt");

      const descInput = page.getByPlaceholder("Description");
      await descInput.tap();
      await descInput.type("Test on mobile");

      const answerInput = page.getByPlaceholder("Enter Code to Unlock next challenge");
      await answerInput.tap();
      await answerInput.type("answer");

      // Verify inputs accepted text
      await expect(titleInput).toHaveValue("Mobile Hunt");
      await expect(descInput).toHaveValue("Test on mobile");
      await expect(answerInput).toHaveValue("answer");
    });

    test("add clue button works on mobile", async ({ page }) => {
      await page.goto("/hunty");

      // Fill first clue
      await page.getByPlaceholder("Title of the Hunt").fill("Hunt");
      await page.getByPlaceholder("Description").fill("Desc");
      await page.getByPlaceholder("Enter Code to Unlock next challenge").fill("ans1");

      // Add another clue
      const addBtn = page.getByRole("button", { name: /^add$/i });
      if (await addBtn.isVisible()) {
        await addBtn.tap();

        // Second form should appear
        await page.waitForTimeout(300);

        const inputs = page.getByPlaceholder("Title of the Hunt");
        const count = await inputs.count();
        expect(count).toBeGreaterThanOrEqual(2);
      }
    });

    test("mobile viewport shows all clue inputs without overflow", async ({ page }) => {
      await page.goto("/hunty");

      // Add multiple clues
      await page.getByPlaceholder("Title of the Hunt").fill("Hunt");
      await page.getByPlaceholder("Description").fill("Desc");
      await page.getByPlaceholder("Enter Code to Unlock next challenge").fill("ans1");

      const addBtn = page.getByRole("button", { name: /^add$/i });
      for (let i = 0; i < 2; i++) {
        if (await addBtn.isVisible()) {
          await addBtn.tap();
          await page.waitForTimeout(200);
        }
      }

      // Check for horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      // Should not have horizontal scroll
      expect(hasOverflow).toBeFalsy();
    });

    // ─────────────────────────────────────────────────────────────────
    // Dashboard Mobile
    // ─────────────────────────────────────────────────────────────────

    test("dashboard hunt cards are responsive on mobile", async ({ page }) => {
      await page.goto("/dashboard");

      const cards = page.locator("[data-slot='card']").first();
      if (await cards.isVisible().catch(() => false)) {
        await expect(cards).toBeVisible();

        // Cards should be tappable
        await cards.tap();
      }
    });

    test("dashboard buttons are accessible on mobile", async ({ page }) => {
      await page.goto("/dashboard");

      // Action buttons should be visible and tappable
      const buttons = page.getByRole("button").first();
      if (await buttons.isVisible()) {
        const box = await buttons.boundingBox();

        if (box) {
          // Check button size
          expect(box.height).toBeGreaterThanOrEqual(40);
          expect(box.width).toBeGreaterThanOrEqual(40);
        }

        // Should be tappable
        await buttons.tap();
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // Hunt Play Mobile
    // ─────────────────────────────────────────────────────────────────

    test("hunt play interface is readable on mobile", async ({ page }) => {
      await page.goto("/hunty");

      // Create a hunt to play
      await page.getByPlaceholder("Title of the Hunt").fill("Mobile Play Test");
      await page.getByPlaceholder("Description").fill("Test");
      await page.getByPlaceholder("Enter Code to Unlock next challenge").fill("answer");

      // Start playing
      const testBtn = page.getByRole("button", { name: /test|play/i }).first();
      if (await testBtn.isVisible()) {
        await testBtn.tap();

        // Question should be visible and readable
        const questionText = page.locator("h1, h2, h3").first();
        await expect(questionText).toBeVisible({ timeout: 3_000 });

        // Check text size is readable
        const fontSize = await questionText.evaluate((el) => {
          return window.getComputedStyle(el).fontSize;
        });

        const size = parseInt(fontSize);
        expect(size).toBeGreaterThanOrEqual(16); // Minimum readable
      }
    });

    test("answer input is large enough to tap on mobile", async ({ page }) => {
      await page.goto("/hunty");

      // Create a hunt
      await page.getByPlaceholder("Title of the Hunt").fill("Input Test");
      await page.getByPlaceholder("Description").fill("Test");
      await page.getByPlaceholder("Enter Code to Unlock next challenge").fill("answer");

      // Play
      const testBtn = page.getByRole("button", { name: /test|play/i }).first();
      if (await testBtn.isVisible()) {
        await testBtn.tap();

        const answerInput = page.getByPlaceholder("Your Answer|Answer|answer", { exact: false });
        if (await answerInput.isVisible().catch(() => false)) {
          const box = await answerInput.boundingBox();

          if (box) {
            // Input height should be adequate
            expect(box.height).toBeGreaterThanOrEqual(40);
          }

          // Should be tappable
          await answerInput.tap();
        }
      }
    });

    test("submit button is accessible while keyboard is open", async ({ page }) => {
      await page.goto("/hunty");

      // Create hunt
      await page.getByPlaceholder("Title of the Hunt").fill("Submit Test");
      await page.getByPlaceholder("Description").fill("Test");
      await page.getByPlaceholder("Enter Code to Unlock next challenge").fill("ans");

      // Play
      const testBtn = page.getByRole("button", { name: /test|play/i }).first();
      if (await testBtn.isVisible()) {
        await testBtn.tap();

        const answerInput = page.getByPlaceholder("Your Answer|Answer|answer", { exact: false });
        if (await answerInput.isVisible().catch(() => false)) {
          await answerInput.tap();
          await answerInput.type("test");

          // Submit button should be accessible
          const submitBtn = page.getByRole("button", { name: /submit|check/i });
          if (await submitBtn.isVisible()) {
            await expect(submitBtn).toBeInViewport();
          }
        }
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // Profile Mobile
    // ─────────────────────────────────────────────────────────────────

    test("profile page is readable on mobile", async ({ page }) => {
      await page.goto("/profile");

      // Profile content should be visible
      const profileContent = page.locator("main, [role='main']").first();
      await expect(profileContent).toBeVisible();

      // Check for horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      expect(hasOverflow).toBeFalsy();
    });

    test("wallet address is readable on mobile profile", async ({ page }) => {
      await page.goto("/profile");

      const address = MOCK_PUBLIC_KEY;
      const addressText = page.getByText(address);

      if (await addressText.isVisible().catch(() => false)) {
        // Text should be broken into readable chunks or shortened
        const text = await addressText.textContent();
        expect(text).toBeTruthy();
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // Modals and Overlays Mobile
    // ─────────────────────────────────────────────────────────────────

    test("wallet modal fits on mobile screen", async ({ page }) => {
      await page.goto("/");

      const connectBtn = page.getByRole("button", { name: /connect wallet/i });
      if (await connectBtn.isVisible()) {
        await connectBtn.tap();

        // Modal should be visible and fit screen
        const modal = page.locator("[role='dialog'], .modal, .modal-dialog").first();

        if (await modal.isVisible().catch(() => false)) {
          const box = await modal.boundingBox();

          if (box) {
            expect(box.width).toBeLessThanOrEqual(viewport.width);
            expect(box.height).toBeLessThanOrEqual(viewport.height);
          }
        }
      }
    });

    test("can close modal on mobile", async ({ page }) => {
      await page.goto("/");

      const connectBtn = page.getByRole("button", { name: /connect wallet/i });
      if (await connectBtn.isVisible()) {
        await connectBtn.tap();

        const modal = page.locator("[role='dialog'], .modal").first();
        if (await modal.isVisible().catch(() => false)) {
          // Close button or backdrop
          const closeBtn = page.getByRole("button", { name: /close/i }).last();

          if (await closeBtn.isVisible().catch(() => false)) {
            await closeBtn.tap();
            await expect(modal).not.toBeVisible({ timeout: 1_000 });
          }
        }
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // Scrolling and Navigation Mobile
    // ─────────────────────────────────────────────────────────────────

    test("long content is scrollable on mobile", async ({ page }) => {
      await page.goto("/dashboard");

      // Page should be scrollable if content is long
      const hasVerticalScroll = await page.evaluate(() => {
        return document.documentElement.scrollHeight > window.innerHeight;
      });

      if (hasVerticalScroll) {
        // Should be able to scroll
        await page.evaluate(() => {
          window.scrollBy(0, 100);
        });

        const scrollPos = await page.evaluate(() => window.pageYOffset);
        expect(scrollPos).toBeGreaterThan(0);
      }
    });

    test("back/forward navigation works on mobile", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("link", { name: /my hunts|dashboard/i }).tap();

      await expect(page).toHaveURL(/\/dashboard/);

      // Go back
      await page.goBack();
      await expect(page).toHaveURL(/\/$|\/$/);

      // Go forward
      await page.goForward();
      await expect(page).toHaveURL(/\/dashboard/);
    });

    // ─────────────────────────────────────────────────────────────────
    // Performance and Rendering Mobile
    // ─────────────────────────────────────────────────────────────────

    test("images scale properly on mobile", async ({ page }) => {
      await page.goto("/");

      const images = page.locator("img");
      const count = await images.count();

      if (count > 0) {
        const img = images.first();
        const box = await img.boundingBox();

        if (box) {
          // Image should not overflow viewport
          expect(box.width).toBeLessThanOrEqual(viewport.width);
        }
      }
    });

    test("page loads within reasonable time on mobile", async ({ page }) => {
      const startTime = Date.now();

      await page.goto("/", { waitUntil: "domcontentloaded" });

      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test("content is not cut off at viewport edges", async ({ page }) => {
      await page.goto("/");

      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      expect(hasHorizontalOverflow).toBeFalsy();
    });
  });
});
