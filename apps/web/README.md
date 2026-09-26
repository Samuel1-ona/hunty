# @hunty/web

The **Hunty** web application — a Next.js 15 App Router app built with React 19,
Tailwind CSS v4, and Zustand for client state. It connects to the Stellar
blockchain via the Stellar SDK and Freighter wallet extension.

## Scripts

| Script | Description |
| --- | --- |
| `dev` | Start the Next.js dev server |
| `build` | Production build |
| `analyze` | Build with `ANALYZE=true` for bundle analysis |
| `bundle:check` | Check bundle sizes against budgets |
| `start` | Start the production server |
| `lint` | Run Next.js ESLint |
| `typecheck` | Run TypeScript in `--noEmit` mode |
| `test` | Run Vitest (single run) |
| `test:watch` | Run Vitest in watch mode |
| `test:coverage` | Run Vitest with v8 coverage |
| `e2e` | Run Playwright end-to-end tests |
| `smoke` | Run Playwright smoke suite |
| `test:e2e:ui` | Open Playwright interactive UI |
| `perf:budget` | Check performance budgets |
| `clean` | Remove `.next` build cache |

## Key dependencies

- **`@hunty/types`** / **`@hunty/ui`** — shared workspace packages for domain
  types and UI components.
- **`@stellar/stellar-sdk`** / **`@stellar/freighter-api`** — Stellar blockchain
  integration and browser wallet connection.
- **`@tanstack/react-query`** — server-state caching and data fetching.
- **`next-intl`** — internationalization.
- **`next-themes`** — dark/light theme switching.
- **`zod`** — runtime schema validation.
- **`zustand`** — lightweight client-side state management.
