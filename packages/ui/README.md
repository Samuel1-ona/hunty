# @hunty/ui

Shared UI component library for the Hunty monorepo. Provides **platform-agnostic
design tokens**, **web (React / Next.js) components**, and **native (React Native
/ Expo) type exports** — all from one package.

## Export paths

| Import             | Source                | Description                                     |
| ------------------ | --------------------- | ----------------------------------------------- |
| `@hunty/ui`        | `src/index.ts`        | Design tokens + web components (default)        |
| `@hunty/ui/tokens` | `src/tokens/index.ts` | Colors, typography, spacing (platform-agnostic) |
| `@hunty/ui/web`    | `src/web/index.ts`    | React / Next.js components                      |
| `@hunty/ui/native` | `src/native/index.ts` | React Native type exports only                  |

### `@hunty/ui/tokens`

Design tokens shared between web and native, kept in sync with the CSS custom
properties in `apps/web/app/globals.css`:

- **colors** — palette, semantic colors
- **typography** — font families, sizes, weights
- **spacing** — spacing scale

### `@hunty/ui/web`

React components imported directly or from the root:

```tsx
import { Button, Card, Badge, EmptyState } from '@hunty/ui/web';
// or
import { Button } from '@hunty/ui';
```

Components: `Button`, `Card` (plus `CardHeader`, `CardTitle`, `CardDescription`,
`CardContent`, `CardFooter`), `Badge`, `EmptyState`.

### `@hunty/ui/native`

Exports **types only** (`ButtonProps`, `CardProps`, `BadgeProps`,
`EmptyStateProps`) so consumers can type-check without pulling React Native
dependencies into web builds. Actual native component implementations live in
`apps/mobile/components`.

```ts
import type { ButtonProps } from '@hunty/ui/native';
```

## Scripts

| Script      | Description                       |
| ----------- | --------------------------------- |
| `typecheck` | Run TypeScript in `--noEmit` mode |
| `lint`      | ESLint (zero warnings)            |
| `test`      | Run Vitest                        |

## Dependencies

- **`@hunty/types`** — shared domain types consumed by native type re-exports
- **`react`** / **`react-dom`** — peer dependencies (≥18)
- **`class-variance-authority`** / **`clsx`** / **`tailwind-merge`** — utility
  classes for component styling
