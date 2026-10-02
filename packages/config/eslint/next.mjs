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
    languageOptions: {
      parserOptions: {
        // `next/typescript` sets `ecmaFeatures.globalReturn: true`, which makes
        // the parser wrap the file in a function-style global scope.  Duplicate
        // *module-scope* bindings then never reach the rule's scope list, so
        // `no-redeclare` reports nothing at all for the most common case (two
        // `const x = ...` in the same file) even though it is set to "error".
        // Nothing in these apps uses a top-level `return`, so turning it off is
        // safe. `jsx` must be repeated: flat config replaces `ecmaFeatures`
        // wholesale rather than merging it.
        ecmaFeatures: {
          jsx: true,
          globalReturn: false,
        },
      },
    },
    rules: {
      ...duplicateBindingRules,
      "@typescript-eslint/no-redeclare": "error",
    },
  },
];

export default config;
