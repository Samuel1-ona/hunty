import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["e2e/**", "node_modules/**", "mobile/**"],
    coverage: {
      provider: "v8",
      all: true,
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["lib/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}"],
      exclude: [
        "lib/**/__tests__/**",
        "hooks/**/__tests__/**",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/*.d.ts",
        "vitest.setup.ts",
        "**/*.config.*",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
