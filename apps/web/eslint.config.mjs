import nextConfig from "@hunty/config/eslint/next.mjs";

import jsxA11y from "eslint-plugin-jsx-a11y";

// @hunty/config/eslint/next already provides next/core-web-vitals,
// next/typescript, the Storybook flat config, and the shared base config —
// build on top of it instead of re-deriving those via a second FlatCompat.
const eslintConfig = [...nextConfig];

eslintConfig.push({
  plugins: {
    "jsx-a11y": jsxA11y,
    "i18next": (await import("eslint-plugin-i18next")).default,
  },
  rules: {
    // Direct console calls bypass the structured logger (@/lib/logger) and can leak
    // values into browser consoles in production, so they're always an error outside
    // tests and scripts (see the override below).
    "no-console": "error",
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
    "i18next/no-literal-string": ["warn", {
      markupOnly: true,
      ignoreAttribute: ["className", "id", "data-testid", "type", "variant", "size", "href", "src", "alt", "name", "value", "role", "target", "rel", "viewBox", "xmlns", "stroke", "strokeWidth", "strokeLinecap", "strokeLinejoin", "fill", "d", "cy", "cx", "r", "placeholder", "aria-label", "aria-hidden", "aria-expanded", "aria-controls", "aria-describedby", "aria-labelledby"]
    }],
  },
});

// Tests, e2e specs, and standalone scripts legitimately use console output
// (test reporters, CLI progress) and aren't part of the runtime the logger covers.
eslintConfig.push({
  files: [
    "**/__tests__/**",
    "**/*.test.{ts,tsx}",
    "**/*.spec.{ts,tsx}",
    "e2e/**",
    "scripts/**",
  ],
  rules: {
    "no-console": "off",
  },
});

export default eslintConfig;
