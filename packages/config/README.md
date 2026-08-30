# @hunty/config

Shared ESLint, TypeScript, and Tailwind CSS configurations for the Hunty
monorepo. Each workspace imports only the configs it needs via the seven export
paths below.

## Export paths

### ESLint

| Import                              | File                      | Description                        |
| ----------------------------------- | ------------------------- | ---------------------------------- |
| `@hunty/config/eslint/base`         | `eslint/base.mjs`         | Base ESLint rules for all packages |
| `@hunty/config/eslint/next`         | `eslint/next.mjs`         | Next.js-specific rules (apps/web)  |
| `@hunty/config/eslint/react-native` | `eslint/react-native.mjs` | React Native rules (apps/mobile)   |

### TypeScript

| Import                                     | File                         | Description                          |
| ------------------------------------------ | ---------------------------- | ------------------------------------ |
| `@hunty/config/tsconfig/base.json`         | `tsconfig/base.json`         | Base TS config for all packages      |
| `@hunty/config/tsconfig/nextjs.json`       | `tsconfig/nextjs.json`       | Next.js TS config (apps/web)         |
| `@hunty/config/tsconfig/react-native.json` | `tsconfig/react-native.json` | React Native TS config (apps/mobile) |

### Tailwind

| Import                   | File                | Description                |
| ------------------------ | ------------------- | -------------------------- |
| `@hunty/config/tailwind` | `tailwind/index.js` | Shared Tailwind CSS preset |

## Usage

Each workspace extends the configs it needs:

```jsonc
// tsconfig.json
{ "extends": "@hunty/config/tsconfig/nextjs.json" }
```

```js
// eslint.config.mjs
import base from '@hunty/config/eslint/next';
export default base;
```

## Scripts

This package has no scripts — it is a configuration-only package consumed by
other workspaces.
