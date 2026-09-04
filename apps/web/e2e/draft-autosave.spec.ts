import { expect, test } from "@playwright/test";

import { injectMockWallet, seedHuntData } from "./helpers/mock-wallet";

test.describe("Hunt Draft Autosave and Recovery", () => {
  test("drafts a hunt, reloads, and asserts recovery (local-only path)", async ({ page }) => {
    // No wallet injected, so it uses the local-only path
    await page.goto("/hunty");

    // Fill in a clue
    await page.getByPlaceholder("Title of the Hunt").fill("Local Only Draft Hunt");
    await page.getByPlaceholder("Description").fill("This should be saved to local storage.");
    await page.getByPlaceholder("Enter Code to Unlock next challenge").fill("local123");

    // Wait for the local debounce (1500ms) plus a little buffer
    await page.waitForTimeout(2000);

    // Reload the page to simulate accidental close or refresh
    await page.reload();

    // The recovery prompt should be visible
    const restoreBtn = page.getByRole("button", { name: /restore draft/i });
    await expect(restoreBtn).toBeVisible();

    // Restore the draft
    await restoreBtn.click();

    // Assert that the fields are populated with the saved data
    await expect(page.getByPlaceholder("Title of the Hunt")).toHaveValue("Local Only Draft Hunt");
    await expect(page.getByPlaceholder("Description")).toHaveValue(
      "This should be saved to local storage."
    );
    await expect(page.getByPlaceholder("Enter Code to Unlock next challenge")).toHaveValue(
      "local123"
    );
  });

  test("covers cloud sync when a wallet is connected", async ({ page }) => {
    // Inject mock wallet to simulate connected state
    await injectMockWallet(page);
    await seedHuntData(page);

    await page.goto("/hunty");

    // Set network intercept to capture cloud sync request
    const syncPromise = page.waitForRequest(
      (req) => req.url().includes("/api/v1/drafts") && req.method() === "POST"
    );

    // Fill in a clue to trigger autosave
    await page.getByPlaceholder("Title of the Hunt").fill("Cloud Sync Draft Hunt");
    await page.getByPlaceholder("Description").fill("This should sync to the server.");
    await page.getByPlaceholder("Enter Code to Unlock next challenge").fill("cloud456");

    // Wait for the cloud sync debounce (5000ms) plus buffer
    const syncRequest = await syncPromise;
    expect(syncRequest).toBeTruthy();

    const postData = JSON.parse(syncRequest.postData() || "{}");
    expect(postData.hunts[0].title).toBe("Cloud Sync Draft Hunt");
    expect(postData.ownerKey).toBeTruthy(); // Should have ownerKey since wallet is connected

    // Wait for the local debounce (1500ms) just to be sure it's fully saved locally too
    await page.waitForTimeout(2000);

    // Reload the page
    await page.reload();

    // The recovery prompt should be visible
    const restoreBtn = page.getByRole("button", { name: /restore draft/i });
    await expect(restoreBtn).toBeVisible();

    // Restore the draft
    await restoreBtn.click();

    // Assert that the fields are populated with the saved data
    await expect(page.getByPlaceholder("Title of the Hunt")).toHaveValue("Cloud Sync Draft Hunt");
  });
});
