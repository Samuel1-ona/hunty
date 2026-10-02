import { dirname } from "path";
import { fileURLToPath } from "url";

import { FlatCompat } from "@eslint/eslintrc";

import baseConfig, { duplicateBindingRules } from "@hunty/config/eslint/base.mjs";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import storybook from "eslint-plugin-storybook";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// lint-staged invokes `eslint --fix` with cwd at the repo root, so this is
// the config actually used for staged files under apps/web and packages/*
// during pre-commit — not just their own per-package eslint.config.mjs
// (those only apply when a package's own `lint` script sets cwd there).
const eslintConfig = [
  ...baseConfig,
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...storybook.configs["flat/recommended"],
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
      "react-hooks": reactHooks,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      ...reactHooks.configs.recommended.rules,
    },
  },
];

const isProduction = process.env.NODE_ENV === "production";

eslintConfig.push({
  rules: {
    // In production builds treat any console usage as an error to avoid
    // leaking sensitive data (warnings during development remain helpful).
    "no-console": isProduction ? ["error", { allow: ["warn", "error"] }] : "warn",
    "@typescript-eslint/no-explicit-any": "error",
  },
});

eslintConfig.push({
  files: ["**/*.test.*", "**/*.spec.*", "**/__tests__/**/*"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
  },
});

// `compat.extends("next/typescript")` above turns the base `no-redeclare` off
// in favour of its TypeScript-aware variant, and the shared base block is
// applied before it — re-assert the duplicate-import/redeclare rules last so
// root-level lint (lint-staged pre-commit) keeps them at error severity too.
// The TypeScript parser does not feed duplicate bindings to the base rule, so
// the plugin variant is required for it to have any effect here.
eslintConfig.push({
  rules: {
    ...duplicateBindingRules,
    "@typescript-eslint/no-redeclare": "error",
  },
});

export default eslintConfig;
