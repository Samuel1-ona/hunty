/**
 * E2E test for Hunt Chat
 *
 * Verifies that a message sent in one browser context can be received
 * in another browser context on the same hunt detail page.
 *
 * The chat is persisted in localStorage per hunt, so the test
 * copies the message data between contexts to simulate cross-user
 * delivery.
 */

import { expect, test } from "@playwright/test";

import { injectMockWallet, MOCK_PUBLIC_KEY, seedHuntData } from "./helpers/mock-wallet";

const HUNT_ID = 100;

test.describe("Hunt Chat", () => {
  test("send and receive a message between two browser contexts", async ({ browser }) => {
    // ── Create two isolated browser contexts ──────────────────────
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // ── Set up wallet + hunt data on both contexts ───────────────
    await injectMockWallet(page1);
    await seedHuntData(page1);
    await page1.goto(`/hunt/${HUNT_ID}`);

    await injectMockWallet(page2);
    await seedHuntData(page2);
    await page2.goto(`/hunt/${HUNT_ID}`);

    // ── Wait for wallet connection to stabilise on both pages ────
    const shortKey = `${MOCK_PUBLIC_KEY.slice(0, 6)}...${MOCK_PUBLIC_KEY.slice(-6)}`;
    await expect(page1.getByText(shortKey)).toBeVisible({ timeout: 10_000 });
    await expect(page2.getByText(shortKey)).toBeVisible({ timeout: 10_000 });

    // ── Open chat on context 1 and send a message ────────────────
    const chatButton1 = page1.locator("div.fixed.bottom-4.right-4.z-50 button");
    await chatButton1.click();

    await expect(page1.getByText("Hunt Chat")).toBeVisible();

    const messageInput = page1.getByPlaceholder("Type a message...");
    await messageInput.fill("Hello from context 1!");
    await messageInput.press("Enter");

    // Verify the message appears in context 1
    await expect(page1.getByText("Hello from context 1!")).toBeVisible();

    // ── Copy chat messages from context 1 into context 2 ─────────
    const chatMessages = await page1.evaluate(
      (huntId: number) => localStorage.getItem(`hunty_chat_messages_${huntId}`),
      HUNT_ID,
    );

    await page2.evaluate(
      ({ huntId, messages }: { huntId: number; messages: string | null }) => {
        if (messages) {
          localStorage.setItem(`hunty_chat_messages_${huntId}`, messages);
        }
      },
      { huntId: HUNT_ID, messages: chatMessages },
    );

    // ── Open chat on context 2 and verify the received message ───
    const chatButton2 = page2.locator("div.fixed.bottom-4.right-4.z-50 button");
    await chatButton2.click();

    await expect(page2.getByText("Hunt Chat")).toBeVisible();

    // The message sent from context 1 should now be visible in context 2
    await expect(page2.getByText("Hello from context 1!")).toBeVisible();

    // ── Clean up ─────────────────────────────────────────────────
    await context1.close();
    await context2.close();
  });
});
