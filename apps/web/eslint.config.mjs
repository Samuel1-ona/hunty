// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import jsxA11y from "eslint-plugin-jsx-a11y";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...storybook.configs["flat/recommended"],
];

const isProduction = process.env.NODE_ENV === "production";

eslintConfig.push({
  plugins: {
    "jsx-a11y": jsxA11y,
  },
  rules: {
    "no-console": isProduction ? "error" : "warn",
    "jsx-a11y/control-has-associated-label": "error",
    "jsx-a11y/interactive-supports-focus": "error",
    // React Native must not be imported in the web app.
    // Native components live in packages/ui/src/native/ and are consumed
    // by the mobile app only. If you need shared UI, use @hunty/ui/web.
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "react-native",
            message:
              "react-native is not a dependency of apps/web. Use @hunty/ui/web for shared UI components.",
          },
        ],
        patterns: [
          {
            group: ["react-native/*", "@react-native/*", "react-native-*"],
            message:
              "react-native packages are not allowed in apps/web. Use @hunty/ui/web for shared UI components.",
          },
        ],
      },
    ],
  },
});

export default eslintConfig;
