import jsxA11y from "eslint-plugin-jsx-a11y";

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
];

export default config;
