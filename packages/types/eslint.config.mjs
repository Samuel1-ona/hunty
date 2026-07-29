import tseslint from "typescript-eslint";

export default tseslint.config(...tseslint.configs.recommended, {
  rules: {
    "no-console": "warn",
  },
});
import base from "@hunty/config/eslint/base.mjs";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...base,
  {
    rules: {
      "no-console": "off",
    },
  },
];

export default config;
