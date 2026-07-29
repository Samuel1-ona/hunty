import nextConfig from "@hunty/config/eslint/next.mjs";

import { dirname } from "path"
import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintrc"
import jsxA11y from "eslint-plugin-jsx-a11y"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
]

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
    "i18next/no-literal-string": ["warn", {
      markupOnly: true,
      ignoreAttribute: ["className", "id", "data-testid", "type", "variant", "size", "href", "src", "alt", "name", "value", "role", "target", "rel", "viewBox", "xmlns", "stroke", "strokeWidth", "strokeLinecap", "strokeLinejoin", "fill", "d", "cy", "cx", "r", "placeholder", "aria-label", "aria-hidden", "aria-expanded", "aria-controls", "aria-describedby", "aria-labelledby"]
    }],
  },
})

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
})

export default eslintConfig;

