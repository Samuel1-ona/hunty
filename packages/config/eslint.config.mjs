import base from "./eslint/base.mjs";

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
