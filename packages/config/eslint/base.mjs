import jsxA11y from "eslint-plugin-jsx-a11y";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    plugins: {
      "jsx-a11y": jsxA11y,
    },
    rules: {
      "no-console":
        process.env.NODE_ENV === "production" ? "error" : "warn",
      "jsx-a11y/control-has-associated-label": "error",
      "jsx-a11y/interactive-supports-focus": "error",
    },
  },
  // Type-aware rules — works automatically for any consumer whose tsconfig
  // is at the project root (apps/*, packages/*).  The `project: true` option
  // tells the parser to locate the nearest tsconfig.json from each linted file.
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: true,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
];

export default config;