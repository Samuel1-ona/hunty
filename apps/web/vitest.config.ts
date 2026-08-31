import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  // Vite 8 defaults to oxc, which skips the React plugin's esbuild JSX transform.
  // Force automatic JSX runtime so .tsx sources parse under import analysis.
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
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
      "@hunty/config": path.resolve(__dirname, "../../packages/config"),
      "@hunty/config/*": path.resolve(__dirname, "../../packages/config/*"),
      "@hunty/types/schemas": path.resolve(__dirname, "../../packages/types/src/schemas.ts"),
      "@hunty/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
      "@": path.resolve(__dirname, "./"),
    },
    // Keep subpath aliases ahead of the package root alias. Vite matches
    // aliases by prefix, so @hunty/types would otherwise swallow
    // @hunty/types/api-schemas.
    alias: [
      // @upstash/redis is an optional runtime dependency not installed in the
      // dev/test environment.  Redirect it to a lightweight stub so Vite's
      // static import-analysis does not fail when it encounters the dynamic
      // `await import("@upstash/redis")` inside lib/rate-limit.ts.
      {
        find: "@upstash/redis",
        replacement: path.resolve(__dirname, "./__mocks__/@upstash/redis.ts"),
      },
      {
        find: "@hunty/types/api-schemas",
        replacement: path.resolve(__dirname, "../../packages/types/src/api-schemas.ts"),
      },
      {
        find: "@hunty/types/schemas",
        replacement: path.resolve(__dirname, "../../packages/types/src/schemas.ts"),
      },
      {
        find: "@hunty/types",
        replacement: path.resolve(__dirname, "../../packages/types/src/index.ts"),
      },
      { find: "@", replacement: path.resolve(__dirname, "./") },
    ],
  },
});
