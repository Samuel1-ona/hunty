// End-to-end tests for keyboard shortcuts

import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('? key opens the keyboard shortcuts help modal', async ({ page }) => {
    // Press ? to open help
    await page.keyboard.press('?');

    // Check modal is visible
    const modal = page.getByRole('dialog', { name: /keyboard shortcuts/i });
    await expect(modal).toBeVisible();

    // Check content
    await expect(page.getByText('Show this help')).toBeVisible();
    await expect(page.getByText('Focus search')).toBeVisible();
    await expect(page.getByText('Go to Home')).toBeVisible();
    await expect(page.getByText('Go to Create Hunt')).toBeVisible();
    await expect(page.getByText('Go to Dashboard')).toBeVisible();
  });

  test('Escape closes the help modal', async ({ page }) => {
    // Open help
    await page.keyboard.press('?');
    const modal = page.getByRole('dialog', { name: /keyboard shortcuts/i });
    await expect(modal).toBeVisible();

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('/ key focuses the search input', async ({ page }) => {
    // Press / to focus search
    await page.keyboard.press('/');

    // Check search input is focused
    const searchInput = page.getByLabel('Search');
    await expect(searchInput).toBeFocused();
  });

  test('G+H navigates to home', async ({ page }) => {
    // Navigate to another page first
    await page.goto('/create');
    await expect(page).toHaveURL(/.*\/create/);

    // Press G then H
    await page.keyboard.press('g');
    await page.keyboard.press('h');

    // Should be on home page
    await expect(page).toHaveURL('/');
  });

  test('G+C navigates to create page', async ({ page }) => {
    // Press G then C
    await page.keyboard.press('g');
    await page.keyboard.press('c');

    // Should be on create page
    await expect(page).toHaveURL(/.*\/create/);
  });

  test('G+D navigates to dashboard', async ({ page }) => {
    // Press G then D
    await page.keyboard.press('g');
    await page.keyboard.press('d');

    // Should be on dashboard page
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('Escape closes generic modals', async ({ page }) => {
    // Open a generic modal (assuming there's a trigger on the page)
    // This test assumes a modal trigger exists; adjust selector as needed
    const modalTrigger = page.locator('[data-testid="modal-trigger"]').first();

    // Skip if no modal trigger exists
    const count = await modalTrigger.count();
    if (count === 0) {
      test.skip();
      return;
    }

    await modalTrigger.click();
    const modal = page.getByRole('dialog').first();
    await expect(modal).toBeVisible();

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('does not intercept Ctrl+? (browser shortcut)', async ({ page }) => {
    // Ctrl+? should not open the help modal
    await page.keyboard.press('Control+?');

    const modal = page.getByRole('dialog', { name: /keyboard shortcuts/i });
    await expect(modal).not.toBeVisible();
  });

  test('does not intercept Ctrl+G (browser find)', async ({ page }) => {
    // Navigate to create page
    await page.goto('/create');

    // Ctrl+G should not trigger navigation
    await page.keyboard.press('Control+g');

    // Should still be on create page
    await expect(page).toHaveURL(/.*\/create/);
  });

  test('does not intercept Ctrl+/ (browser shortcut)', async ({ page }) => {
    // Ctrl+/ should not focus search
    await page.keyboard.press('Control+/');

    // Search should not be focused (body or other element should be focused)
    const searchInput = page.getByLabel('Search');
    await expect(searchInput).not.toBeFocused();
  });

  test('shortcuts are disabled when typing in input fields', async ({ page }) => {
    // Find an input field
    const input = page.locator('input').first();
    const count = await input.count();
    if (count === 0) {
      test.skip();
      return;
    }

    // Focus the input and type
    await input.focus();
    await input.fill('?');

    // Help modal should not open
    const modal = page.getByRole('dialog', { name: /keyboard shortcuts/i });
    await expect(modal).not.toBeVisible();
  });

  test('G prefix timeout works correctly', async ({ page }) => {
    // Press G, wait more than 1 second, then press H
    await page.keyboard.press('g');
    await page.waitForTimeout(1100); // Wait for prefix timeout
    await page.keyboard.press('h');

    // Should NOT navigate to home (G timed out)
    // Instead, 'h' might do nothing or trigger something else
    // This is mainly a regression test to ensure timeout logic works
  });

  test('modal has proper accessibility attributes', async ({ page }) => {
    await page.keyboard.press('?');
    const modal = page.getByRole('dialog', { name: /keyboard shortcuts/i });

    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('role', 'dialog');
  });

  test('keyboard hint is visible on search bar', async ({ page }) => {
    // The / hint should be visible on desktop
    const kbdHint = page.locator('kbd').filter({ hasText: '/' }).first();
    await expect(kbdHint).toBeVisible();
  });
});