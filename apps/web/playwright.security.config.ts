/**
 * Playwright config for security-only specs.
 *
 * Intentionally has NO webServer block — the app must already be running
 * before this suite starts (handled by the CI workflow step or locally via
 * `pnpm dev`). This keeps security CI fast and avoids a second build step.
 *
 * Run locally:
 *   pnpm --filter @hunty/web security:test
 * or from the repo root:
 *   pnpm security:test
 */
import { defineConfig, devices } from "@playwright/test";

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  // Only run the security spec file
  testDir: "./e2e",
  testMatch: ["**/security.spec.ts"],

  // One worker is intentional: rate-limiting tests rely on request ordering
  workers: 1,
  fullyParallel: false,

  // In CI, fail fast on any flake — no retries that could hide real failures
  retries: 0,
  forbidOnly: !!process.env.CI,

  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { outputFolder: "playwright-security-report", open: "never" }],
      ]
    : [["html", { outputFolder: "playwright-security-report" }]],

  use: {
    baseURL: BASE_URL,
    // Capture a full trace on the first (and only) attempt so failures are
    // always diagnosable in CI without a retry overhead.
    trace: "on",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // No webServer — caller is responsible for starting the app.
});
