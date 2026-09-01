import baseConfig from "./base.mjs";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    rules: {
      // React Native specific overrides
      "no-console": process.env.NODE_ENV === "production" ? "error" : "warn",
    },
  },
];

export default config;
