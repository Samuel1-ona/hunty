/**
 * Minimal Playwright config for running the security spec against an
 * already-running server (used for the vulnerability demonstration).
 * Deliberately has no webServer block so it connects to whatever is
 * at BASE_URL without trying to start Next.js.
 *
 * Usage:
 *   node scripts/vulnerable-server.mjs &
 *   BASE_URL=http://localhost:4000 \
 *     npx playwright test e2e/security.spec.ts \
 *       --config=playwright.security-demo.config.ts \
 *       --project=chromium-desktop
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["line"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "off",
  },
  // No webServer — caller must ensure server is already running.
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
