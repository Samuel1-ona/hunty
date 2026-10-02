import { FlatCompat } from "@eslint/eslintrc";
import storybook from "eslint-plugin-storybook";
import { dirname } from "path";
import { fileURLToPath } from "url";

import baseConfig, { duplicateBindingRules } from "./base.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...storybook.configs["flat/recommended"],
  ...baseConfig,
  // `@typescript-eslint/parser` (registered by next/typescript above) does not
  // report duplicate bindings to the base `no-redeclare` rule, so the
  // TypeScript-aware variant is what actually catches them here.
  {
    rules: {
      ...duplicateBindingRules,
      "@typescript-eslint/no-redeclare": "error",
    },
  },
];

export default config;
