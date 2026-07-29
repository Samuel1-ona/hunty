import baseConfig from "@hunty/config/eslint/base.mjs";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = [
  ...baseConfig,
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
  plugins: {
    "jsx-a11y": jsxA11y,
    "simple-import-sort": simpleImportSort,
    "react-hooks": reactHooks,
  },
  rules: {
    // In production builds treat any console usage as an error to avoid
    // leaking sensitive data (warnings during development remain helpful).
    "no-console": isProduction ? ["error", { allow: ["warn", "error"] }] : "warn",
    "jsx-a11y/control-has-associated-label": "error",
    "jsx-a11y/interactive-supports-focus": "error",
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    "@typescript-eslint/no-explicit-any": "error",
    ...reactHooks.configs.recommended.rules,
  },
];

eslintConfig.push({
  files: ["**/*.test.*", "**/*.spec.*", "**/__tests__/**/*"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
  },
});

export default eslintConfig;
