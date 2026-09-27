import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["html"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  // ── Visual regression — Issue #664 ──────────────────────────────────────────
  // Baseline screenshots are stored in e2e/screenshots/.
  // The {projectName} token keeps baselines separate per browser/viewport so
  // a chromium-desktop baseline does not conflict with mobile-chrome.
  snapshotDir: "./e2e/screenshots",
  snapshotPathTemplate: "{snapshotDir}/{testFilePath}/{projectName}/{arg}{ext}",
  // ────────────────────────────────────────────────────────────────────────────
  projects: [
    // ── Desktop ──────────────────────────────────────────────────────────────
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
      // Only run visual regression tests in this project by default; other
      // specs use msedge locally and chromium in CI.
    },
    // Local-only: Edge (skip in CI where it is unavailable on ubuntu)
    ...(!process.env.CI
      ? [
          {
            name: "msedge",
            use: { ...devices["Desktop Edge"], channel: "msedge" },
          },
        ]
      : []),
    // ── Mobile ───────────────────────────────────────────────────────────────
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "iphone",
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "pixel",
      use: { ...devices["Pixel 5"] },
    },
    // Dark-mode / CSS-compat project (runs on Chromium emulation)
    {
      name: "chromium-dark",
      use: { ...devices["Desktop Chrome"], colorScheme: "dark", reducedMotion: "reduce" },
    },
    // Optional wallet-extension project: only enabled when WALLET_EXTENSION_PATH is set
    ...(process.env.WALLET_EXTENSION_PATH
      ? [
          {
            name: "chromium-wallet",
            use: {
              ...devices["Desktop Chrome"],
              launchOptions: {
                args: [
                  `--disable-extensions-except=${process.env.WALLET_EXTENSION_PATH}`,
                  `--load-extension=${process.env.WALLET_EXTENSION_PATH}`,
                ],
              },
            },
          },
        ]
      : []),
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
