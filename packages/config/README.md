# @hunty/config

Shared ESLint, TypeScript, and Tailwind CSS configurations for the Hunty
monorepo. Each workspace imports only the configs it needs via the seven export
paths below.

## Export paths

### ESLint

| Import | File | Description |
| --- | --- | --- |
| `@hunty/config/eslint/base` | `eslint/base.mjs` | Base ESLint rules for all packages |
| `@hunty/config/eslint/next` | `eslint/next.mjs` | Next.js-specific rules (apps/web) |
| `@hunty/config/eslint/react-native` | `eslint/react-native.mjs` | React Native rules (apps/mobile) |

### TypeScript

| Import | File | Description |
| --- | --- | --- |
| `@hunty/config/tsconfig/base.json` | `tsconfig/base.json` | Base TS config for all packages |
| `@hunty/config/tsconfig/nextjs.json` | `tsconfig/nextjs.json` | Next.js TS config (apps/web) |
| `@hunty/config/tsconfig/react-native.json` | `tsconfig/react-native.json` | React Native TS config (apps/mobile) |

### Tailwind

| Import | File | Description |
| --- | --- | --- |
| `@hunty/config/tailwind` | `tailwind/index.js` | Shared Tailwind CSS preset |

## Usage

Each workspace extends the configs it needs:

```jsonc
// tsconfig.json
{ "extends": "@hunty/config/tsconfig/nextjs.json" }
```

```js
// eslint.config.mjs
import base from "@hunty/config/eslint/next"
export default base
```

## Scripts

| Script | What it does |
| --- | --- |
| `lint` | Lints this package against its own flat config |
| `typecheck` | Type-checks `tsconfig.json` |
| `check:next-pins` | Asserts the Next.js ESLint packages match the pinned `next` version |
| `test` | Runs `validate-exports.mjs`, then the Next.js pin check |

`scripts/validate-exports.mjs` loads every export the way a consumer would —
ESLint configs through the real ESLint CLI, tsconfigs through TypeScript's own
loader, the Tailwind preset via `import` — so a broken export fails here instead
of in a consuming workspace. `scripts/check-next-eslint-pins.mjs` keeps
`eslint-config-next` and `@next/eslint-plugin-next` pinned to the same version as
`next`; see
[Next.js ESLint version pinning](../../docs/development/NEXT_ESLINT_PINNING.md).
