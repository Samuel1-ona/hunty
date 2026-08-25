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
