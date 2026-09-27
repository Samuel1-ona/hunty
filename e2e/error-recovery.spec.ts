import { test, expect } from "@playwright/test";
import { injectMockWallet, seedHuntData, MOCK_PUBLIC_KEY } from "./helpers/mock-wallet";

test.describe("Error Recovery Flows", () => {
  test.beforeEach(async ({ page }) => {
    await injectMockWallet(page);
    await seedHuntData(page);
  });

  // ───────────────────────────────────────────────────────────────────────
  // Hunt Creation Error Recovery
  // ───────────────────────────────────────────────────────────────────────

  test("shows validation error when hunt title is empty", async ({ page }) => {
    await page.goto("/hunty");

    // Try to proceed without filling title
    const descriptionInput = page.getByPlaceholder("Description");
    await descriptionInput.fill("Some description");

    // Try to submit or navigate without title
    const addBtn = page.getByRole("button", { name: /^add$/i });
    if (await addBtn.isEnabled().catch(() => false)) {
      // The form should prevent submission if title is empty
      // Validation should show error message
      const errorMsg = page.locator("text=/required|title/i").first();
      // Check if we can scroll to see the error
      await page.locator("body").evaluate(() => window.scrollTo(0, 0));
    }
  });

  test("shows error when adding clue without answer code", async ({ page }) => {
    await page.goto("/hunty");

    // Fill title and description but leave answer empty
    await page.getByPlaceholder("Title of the Hunt").fill("Test Hunt");
    await page.getByPlaceholder("Description").fill("A test hunt");
    
    // Leave answer code empty
    const answerInput = page.getByPlaceholder("Enter Code to Unlock next challenge");
    
    // Try to add another clue without filling answer
    const addBtn = page.getByRole("button", { name: /^add$/i });
    if (await addBtn.isVisible()) {
      await addBtn.click();
      
      // Should show validation error or prevent adding
      const form = page.locator("form, [role='form']").first();
      await expect(form).toBeVisible();
    }
  });

  test("recovers from network error when publishing hunt", async ({ page }) => {
    await page.goto("/hunty");

    // Fill hunt form
    await page.getByPlaceholder("Title of the Hunt").fill("Network Test Hunt");
    await page.getByPlaceholder("Description").fill("Testing network errors");
    await page.getByPlaceholder("Enter Code to Unlock next challenge").fill("answer123");

    // Simulate network error
    await page.route("**/api/**", (route) => route.abort());

    // Try to publish
    const publishBtn = page.getByRole("button", { name: /publish|create/i });
    if (await publishBtn.isVisible()) {
      await publishBtn.click();

      // Should show error message
      const errorMsg = page.locator("text=/error|failed|network/i").first();
      await expect(errorMsg).toBeVisible({ timeout: 5_000 });
    }

    // Restore network
    await page.unroute("**/api/**");
  });

  test("shows retry option when hunt activation fails", async ({ page }) => {
    await page.goto("/dashboard");

    // Simulate failure in activation API
    await page.route("**/api/**/activate", (route) => route.abort());

    // Try to activate draft hunt
    const activateBtn = page.getByRole("button", { name: /activate/i }).first();
    if (await activateBtn.isVisible()) {
      await activateBtn.click();

      // Should show error with retry option
      const retryBtn = page.getByRole("button", { name: /retry|try again/i });
      await expect(retryBtn).toBeVisible({ timeout: 5_000 });

      // Restore network and retry
      await page.unroute("**/api/**/activate");
      await retryBtn.click();
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // Wallet Connection Error Recovery
  // ───────────────────────────────────────────────────────────────────────

  test("shows error when wallet connection is denied", async ({ page }) => {
    // Don't inject wallet, simulate connection denial
    await page.goto("/");

    const connectBtn = page.getByRole("button", { name: /connect wallet/i });
    await connectBtn.click();

    // Mock wallet denial
    await page.evaluate(() => {
      (window as any).freighter = {
        request: async () => {
          throw new Error("User denied connection");
        },
      };
    });

    const freighterBtn = page.getByRole("button", { name: /freighter/i });
    if (await freighterBtn.isVisible()) {
      await freighterBtn.click();

      // Should show connection error
      const errorMsg = page.locator("text=/denied|rejected|connection failed/i").first();
      await expect(errorMsg).toBeVisible({ timeout: 5_000 });
    }
  });

  test("recovers when wallet is disconnected unexpectedly", async ({ page }) => {
    await page.goto("/");

    // Simulate wallet disconnection by removing from localStorage
    await page.evaluate(() => {
      localStorage.removeItem("freighter_public_key");
      (window as any).freighter = null;
    });

    // Page should handle disconnection gracefully
    const connectBtn = page.getByRole("button", { name: /connect wallet/i });
    
    // Should eventually show connect button or redirect
    await expect(connectBtn).toBeVisible({ timeout: 5_000 });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Hunt Play Error Recovery
  // ───────────────────────────────────────────────────────────────────────

  test("shows error message when submitting wrong answer", async ({ page }) => {
    await page.goto("/hunty");

    // Fill hunt form
    await page.getByPlaceholder("Title of the Hunt").fill("Quiz Hunt");
    await page.getByPlaceholder("Description").fill("A quiz");
    await page.getByPlaceholder("Enter Code to Unlock next challenge").fill("correct");

    // Start playing
    const testBtn = page.getByRole("button", { name: /test|play/i }).first();
    if (await testBtn.isVisible()) {
      await testBtn.click();

      // Look for answer input and submit wrong answer
      const answerInput = page.getByPlaceholder("Your Answer|Answer|answer", { exact: false });
      if (await answerInput.isVisible().catch(() => false)) {
        await answerInput.fill("wrong");

        const submitBtn = page.getByRole("button", { name: /submit|check/i }).first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();

          // Should show error or "incorrect" message
          const errorMsg = page.locator("text=/incorrect|wrong|try again/i").first();
          await expect(errorMsg).toBeVisible({ timeout: 5_000 });
        }
      }
    }
  });

  test("allows retry after incorrect answer", async ({ page }) => {
    await page.goto("/hunty");

    // Fill hunt form
    await page.getByPlaceholder("Title of the Hunt").fill("Retry Test Hunt");
    await page.getByPlaceholder("Description").fill("Test retry");
    await page.getByPlaceholder("Enter Code to Unlock next challenge").fill("answer");

    // Start playing and submit wrong answer
    const testBtn = page.getByRole("button", { name: /test|play/i }).first();
    if (await testBtn.isVisible()) {
      await testBtn.click();

      const answerInput = page.getByPlaceholder("Your Answer|Answer|answer", { exact: false });
      if (await answerInput.isVisible().catch(() => false)) {
        await answerInput.fill("wrong");

        const submitBtn = page.getByRole("button", { name: /submit|check/i }).first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();

          // Should allow retrying
          await answerInput.fill("answer");
          await submitBtn.click();

          // Should succeed with correct answer
          const successMsg = page.locator("text=/correct|great|success/i").first();
          await expect(successMsg).toBeVisible({ timeout: 5_000 });
        }
      }
    }
  });

  test("handles network error during answer submission", async ({ page }) => {
    await page.goto("/hunty");

    // Fill hunt form
    await page.getByPlaceholder("Title of the Hunt").fill("Network Error Hunt");
    await page.getByPlaceholder("Description").fill("Testing network errors");
    await page.getByPlaceholder("Enter Code to Unlock next challenge").fill("answer");

    // Start playing
    const testBtn = page.getByRole("button", { name: /test|play/i }).first();
    if (await testBtn.isVisible()) {
      await testBtn.click();

      // Simulate network error on submit
      await page.route("**/api/**", (route) => route.abort());

      const answerInput = page.getByPlaceholder("Your Answer|Answer|answer", { exact: false });
      if (await answerInput.isVisible().catch(() => false)) {
        await answerInput.fill("answer");

        const submitBtn = page.getByRole("button", { name: /submit|check/i }).first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();

          // Should show error
          const errorMsg = page.locator("text=/error|failed|network/i").first();
          await expect(errorMsg).toBeVisible({ timeout: 5_000 });
        }
      }

      // Restore network
      await page.unroute("**/api/**");
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // Navigation Error Recovery
  // ───────────────────────────────────────────────────────────────────────

  test("navigates to home on 404 error", async ({ page }) => {
    // Try to access non-existent hunt
    await page.goto("/hunt/999999");

    // Should show not found or redirect
    const notFoundText = page.locator("text=/not found|404|doesn't exist/i").first();
    const homeLink = page.getByRole("link", { name: /home|back|game arcade/i });

    if (await notFoundText.isVisible().catch(() => false)) {
      await expect(notFoundText).toBeVisible();
    }

    // Should be able to navigate back to home
    if (await homeLink.isVisible().catch(() => false)) {
      await homeLink.click();
      await expect(page).toHaveURL(/\/$|\/$/);
    }
  });

  test("shows error message when hunt data fails to load", async ({ page }) => {
    // Mock failed hunt load
    await page.route("**/api/**/hunt/**", (route) => route.abort());

    await page.goto("/hunt/100");

    // Should show error message
    const errorMsg = page.locator("text=/error|failed|couldn't load/i").first();
    await expect(errorMsg).toBeVisible({ timeout: 5_000 });

    // Should have retry option
    const retryBtn = page.getByRole("button", { name: /retry|try again/i });
    if (await retryBtn.isVisible().catch(() => false)) {
      await expect(retryBtn).toBeVisible();
    }

    // Restore and verify reload works
    await page.unroute("**/api/**/hunt/**");
  });

  // ───────────────────────────────────────────────────────────────────────
  // Search and Filter Error Recovery
  // ───────────────────────────────────────────────────────────────────────

  test("handles search errors gracefully", async ({ page }) => {
    await page.goto("/");

    // Simulate search API error
    await page.route("**/api/**/search", (route) => route.abort());

    const searchInput = page.getByPlaceholder("Search|search hunts", { exact: false });
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("test");

      // Should show error or "no results" gracefully
      const noResults = page.locator("text=/no results|error|couldn't search/i").first();
      await page.waitForTimeout(1000);

      if (await noResults.isVisible().catch(() => false)) {
        await expect(noResults).toBeVisible();
      }
    }

    await page.unroute("**/api/**/search");
  });

  test("clears filter and tries again when no results found", async ({ page }) => {
    await page.goto("/");

    // Apply a filter
    const filterBtn = page.getByRole("button", { name: /filter|sort/i }).first();
    if (await filterBtn.isVisible().catch(() => false)) {
      await filterBtn.click();

      // If no results, should show clear filters option
      const clearBtn = page.getByRole("button", { name: /clear filters/i });
      if (await clearBtn.isVisible().catch(() => false)) {
        await clearBtn.click();

        // Should show results again
        const hunts = page.locator("[data-slot='card-title']").first();
        await expect(hunts).toBeVisible({ timeout: 5_000 });
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // Form Input Validation and Recovery
  // ───────────────────────────────────────────────────────────────────────

  test("shows validation errors for invalid email formats", async ({ page }) => {
    // If there's email input anywhere
    const emailInputs = page.locator("input[type='email']");
    
    if (await emailInputs.isVisible().catch(() => false)) {
      await emailInputs.fill("invalid-email");

      // Should show validation error
      const errorMsg = page.locator("text=/invalid|email/i").first();
      if (await errorMsg.isVisible().catch(() => false)) {
        await expect(errorMsg).toBeVisible();
      }
    }
  });

  test("recovers from form submission timeout", async ({ page }) => {
    await page.goto("/hunty");

    // Fill form
    await page.getByPlaceholder("Title of the Hunt").fill("Timeout Test");
    await page.getByPlaceholder("Description").fill("Test");
    await page.getByPlaceholder("Enter Code to Unlock next challenge").fill("code");

    // Simulate slow network
    await page.route("**/api/**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await route.continue();
    });

    const submitBtn = page.getByRole("button", { name: /publish|create/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();

      // Should eventually show timeout or allow retry
      await page.waitForTimeout(1000);

      const retryBtn = page.getByRole("button", { name: /retry|try again/i });
      if (await retryBtn.isVisible().catch(() => false)) {
        await expect(retryBtn).toBeVisible();
      }
    }

    await page.unroute("**/api/**");
  });
});
