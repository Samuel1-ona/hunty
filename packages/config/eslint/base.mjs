import jsxA11y from "eslint-plugin-jsx-a11y";

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
    },
  },
];

export default config;
