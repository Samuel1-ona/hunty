import jsxA11y from "eslint-plugin-jsx-a11y";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

/**
 * Duplicate-import and redeclaration rules, shared so every consumer config
 * can re-assert them *last* — extended presets (next/typescript, expo) turn
 * the base rule off or downgrade it, and a config that only relies on this
 * block silently loses the error severity on those surfaces.
 *
 * - `no-duplicate-imports`: importing the same binding from the same module
 *   twice creates two distinct identifiers, so identity checks (`x === y`)
 *   fail and the intent of the file is unclear. Merge into one statement.
 * - `no-redeclare`: duplicate local bindings are almost always a copy/paste
 *   slip; the later one silently shadows or overwrites the earlier one.
 *
 * @type {Record<string, "error">}
 */
export const duplicateBindingRules = {
  "no-duplicate-imports": "error",
  "no-redeclare": "error",
};

const typeAwareFiles = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"];

const typeAwareLanguageOptions = {
  parser: tsParser,
  parserOptions: {
    project: true,
  },
};

const typeAwareRules = {
  "@typescript-eslint/no-floating-promises": "error",
  "@typescript-eslint/no-misused-promises": "error",
};

/**
 * The type-aware block above *without* the `@typescript-eslint` plugin object.
 *
 * Flat config rejects defining the same plugin twice, and `eslint-config-expo`
 * (used by apps/mobile) already registers it. Presets combined with expo must
 * substitute this for the plugin-carrying block — it keeps the parser, the
 * `project: true` type information and the rules, and only omits the plugin
 * registration that would collide.
 *
 * @type {import("eslint").Linter.Config}
 */
export const typeAwareBlockWithoutPlugin = {
  files: typeAwareFiles,
  languageOptions: typeAwareLanguageOptions,
  rules: typeAwareRules,
};

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
      ...duplicateBindingRules,
    },
  },
  // Type-aware rules — works automatically for any consumer whose tsconfig
  // is at the project root (apps/*, packages/*).  The `project: true` option
  // tells the parser to locate the nearest tsconfig.json from each linted file.
  {
    files: typeAwareFiles,
    languageOptions: typeAwareLanguageOptions,
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: typeAwareRules,
  },
];

export default config;