import { expect, test } from "@playwright/test"
import { injectMockWallet, seedHuntData } from "./helpers/mock-wallet"

test.describe("Spectate mode", () => {
  test("loads seeded hunt spectate page and updates leaderboard", async ({ page }) => {
    await injectMockWallet(page)
    await seedHuntData(page)

    let requestCount = 0
    await page.route("**/api/v1/hunts/100/leaderboard/public", async (route) => {
      requestCount += 1

      const payload =
        requestCount === 1
          ? {
              hunt: { id: 100, title: "E2E Test Hunt", description: "A hunt created for E2E." },
              leaderboard: [
                { position: 1, name: "Alice", points: 120, completionCount: 6 },
                { position: 2, name: "Bob", points: 95, completionCount: 5 },
              ],
              summary: { topRankName: "Alice", topRankPoints: 120, playerCount: 2 },
              embedUrl: "https://hunty.app/api/og/leaderboard?huntId=100",
              shareUrl: "https://hunty.app/hunt/100/leaderboard",
              spectator: true,
            }
          : {
              hunt: { id: 100, title: "E2E Test Hunt", description: "A hunt created for E2E." },
              leaderboard: [
                { position: 1, name: "Bob", points: 160, completionCount: 8 },
                { position: 2, name: "Alice", points: 130, completionCount: 7 },
                { position: 3, name: "Charlie", points: 80, completionCount: 4 },
              ],
              summary: { topRankName: "Bob", topRankPoints: 160, playerCount: 3 },
              embedUrl: "https://hunty.app/api/og/leaderboard?huntId=100",
              shareUrl: "https://hunty.app/hunt/100/leaderboard",
              spectator: true,
            }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      })
    })

    await page.goto("/hunt/100/spectate")

    await expect(page.getByRole("heading", { name: "E2E Test Hunt" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible()
    await expect(page.getByText("Alice")).toBeVisible()
    await expect(page.getByText("Bob")).toBeVisible()

    // Polling runs every 5 seconds. Wait for second payload to be rendered.
    await expect(page.getByText("Charlie")).toBeVisible({ timeout: 12_000 })
    await expect(page.getByText("160 pts")).toBeVisible()

    const liveRegion = page.locator('[aria-live="polite"]')
    await expect(liveRegion).toContainText("Charlie entered the leaderboard at position 3")
  })
})
