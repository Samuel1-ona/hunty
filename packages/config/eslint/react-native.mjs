import reactNativeA11y from "eslint-plugin-react-native-a11y";
import baseConfig, { typeAwareBlockWithoutPlugin } from "./base.mjs";

/** @type {import("eslint").Linter.Config[]} */

// This preset is consumed by apps/mobile, which also extends
// `eslint-config-expo` — and expo registers `@typescript-eslint` itself.  Flat
// config refuses to define the same plugin twice ("Cannot redefine plugin"),
// which made `eslint .` abort in apps/mobile before linting anything, so drop
// the base block that carries the plugin object and use the plugin-free
// variant instead.  Everything that actually matters for type-aware linting
// (the TypeScript parser, `project: true`, and both rules) is preserved.
/** @type {import("eslint").Linter.Config[]} */
const baseWithoutTsPlugin = baseConfig.filter(
  (block) => !block.plugins?.["@typescript-eslint"],
);

const config = [
  ...baseWithoutTsPlugin,

  typeAwareBlockWithoutPlugin,

  {
    plugins: {
      "react-native-a11y": reactNativeA11y,
    },

    rules: {
      ...reactNativeA11y.configs.all.rules,

      // React Native specific overrides
      "no-console": process.env.NODE_ENV === "production" ? "error" : "warn",
    },
  },
];

export default config;