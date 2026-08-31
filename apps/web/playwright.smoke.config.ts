import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.SMOKE_BASE_URL ||
  process.env.DEPLOYMENT_URL ||
  "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e/smoke",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
