import { test, expect } from "@playwright/test";
import { injectMockWallet, seedHuntData } from "./helpers/mock-wallet";

test.describe("Hunt Creation", () => {
  test.beforeEach(async ({ page }) => {
    await injectMockWallet(page);
    await seedHuntData(page);
  });

  test("navigates to create hunt page from home", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /create game/i }).click();

    await expect(page).toHaveURL(/\/hunty/);
    await expect(page.getByText("Create Scavenge Hunt")).toBeVisible();
  });

  test("creator can fill in clue form fields", async ({ page }) => {
    await page.goto("/hunty");

    // The Create tab should be active by default with at least one HuntForm
    await expect(page.getByPlaceholder("Title of the Hunt")).toBeVisible();

    // Fill in the first clue form
    await page.getByPlaceholder("Title of the Hunt").fill("What is the largest planet?");
    await page
      .getByPlaceholder("Description")
      .fill("Think about our solar system.");
    await page
      .getByPlaceholder("Enter Code to Unlock next challenge")
      .fill("jupiter");

    // Verify values are populated
    await expect(page.getByPlaceholder("Title of the Hunt")).toHaveValue(
      "What is the largest planet?"
    );
    await expect(page.getByPlaceholder("Enter Code to Unlock next challenge")).toHaveValue(
      "jupiter"
    );
  });

  test("creator can add multiple clues", async ({ page }) => {
    await page.goto("/hunty");

    // Click the main "Add" button (not "Add Clue") to add another hunt form
    await page.getByRole("button", { name: /^add$/i }).click();

    // There should now be 2 clue forms visible
    const titleInputs = page.getByPlaceholder("Title of the Hunt");
    await expect(titleInputs).toHaveCount(2);
  });

  test("creator can start from a template and edit the pre-filled fields", async ({ page }) => {
    await page.goto("/hunty/templates");

    await page.getByRole("link", { name: /start city walking tour/i }).click();

    await expect(page).toHaveURL(/\/hunty$/);

    const titleInputs = page.getByPlaceholder("Title of the Hunt");
    const descriptionInputs = page.getByPlaceholder("Description");
    const codeInputs = page.getByPlaceholder("Enter Code to Unlock next challenge");

    await expect(titleInputs).toHaveCount(3);
    await expect(titleInputs.nth(0)).toHaveValue("Mural at Sunrise Alley");
    await expect(descriptionInputs.nth(0)).toHaveValue(
      "Find the alley mural with the giant orange sun and note the year painted in the corner."
    );
    await expect(codeInputs.nth(0)).toHaveValue("2019");

    await titleInputs.nth(0).fill("Edited Template Clue");
    await expect(titleInputs.nth(0)).toHaveValue("Edited Template Clue");
  });

  test("publish tab validates form fields", async ({ page }) => {
    await page.goto("/hunty?tab=publish");

    // The Publish Game button should be disabled without valid start/end dates
    const publishBtn = page.getByRole("button", { name: /publish game/i });
    await expect(publishBtn).toBeDisabled();
  });

  test("publish tab accepts valid game name and dates", async ({ page }) => {
    await page.goto("/hunty?tab=publish");

    // Fill in the game name
    const nameInput = page.getByPlaceholder("Hunty");
    await nameInput.clear();
    await nameInput.fill("My Cool Hunt");

    // Set start and end dates
    const today = new Date();
    const startDate = today.toISOString().split("T")[0];
    const futureDate = new Date(
      today.getTime() + 7 * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split("T")[0];

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(startDate);
    await dateInputs.nth(1).fill(futureDate);

    // The publish button should become enabled
    const publishBtn = page.getByRole("button", { name: /publish game/i });
    await expect(publishBtn).toBeEnabled();
  });

  test("completes full hunt creation pipeline", async ({ page }) => {
    // 1. Navigate to Create Game
    await page.goto("/hunty");

    // 2. Create Tab: Fill clue details
    await page.getByPlaceholder("Title of the Hunt").fill("Full Pipeline Test Hunt");
    await page.getByPlaceholder("Description").fill("Ensuring the end-to-end flow works seamlessly.");
    await page.getByPlaceholder("Enter Code to Unlock next challenge").fill("e2eflow");
    
    // Click Next to go to Rewards tab
    await page.getByRole("button", { name: /next/i }).click();

    // 3. Rewards Tab: Proceed to Publish
    await page.getByRole("button", { name: /next/i }).click();

    // 4. Publish Tab: Fill game name and dates
    const nameInput = page.getByPlaceholder("Hunty");
    await nameInput.clear();
    await nameInput.fill("Automated E2E Hunt");

    const today = new Date();
    const startDate = today.toISOString().split("T")[0];
    const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(startDate);
    await dateInputs.nth(1).fill(futureDate);

    // Click "Publish Game" to open the confirmation modal
    await page.getByRole("button", { name: /publish game/i }).click();

    // 5. Confirmation Modal: Confirm creation
    const modalPublishBtn = page.getByRole("dialog").getByRole("button", { name: "Publish", exact: true });
    await modalPublishBtn.click();

    // 6. Assertion: Wait for redirect to the /hunts page
    await expect(page).toHaveURL(/\/hunts/);
  });
});
