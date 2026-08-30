# Quickstart: 5-minute setup

> Verified working on a clean clone (Windows, Node.js 22, pnpm 10.33).
> If a step fails here, it is a bug — please open an issue with your OS and node version.

## Prerequisites

| Tool    | Version                      |
| ------- | ---------------------------- |
| Node.js | >= 20                        |
| pnpm    | 10.x (`npm install -g pnpm`) |

## Setup

```bash
# 1. Clone
git clone https://github.com/Samuel1-ona/hunty.git
cd hunty

# 2. Install all workspace dependencies (apps/web, apps/mobile, packages/*)
pnpm install

# 3. Run the web app
pnpm dev --filter @hunty/web
```

The web app starts at the address shown in the terminal (default: http://localhost:3000).

## Verify your setup

```bash
# Type check across all workspaces
pnpm typecheck

# Unit tests (vitest per workspace)
pnpm test

# Lint
pnpm lint

# Production build
pnpm build
```

## Workspace layout

This is a pnpm + turbo monorepo:

- `apps/web` — Next.js web application
- `apps/mobile` — mobile client
- `packages/types` — shared TypeScript types (`@hunty/types`)
- `packages/config` — shared config
- `packages/ui` — shared UI components

## Common issues

### `pnpm install` fails with engine mismatch

Your Node.js is older than 20. Upgrade via https://nodejs.org/ or `nvm install 20`.

### Port 3000 already in use

`pnpm dev --filter @hunty/web -- -p 3001`

### `pnpm test` fails with react/react-dom version mismatch

Known pre-existing issue in the lockfile (react 19.2.0 vs react-dom 19.2.8).
Run `pnpm install` again after pulling latest; if it persists, align both to
the same version in `apps/web/package.json`.

### `pnpm typecheck` fails in `@hunty/ui` with toBeInTheDocument / toHaveAttribute

Pre-existing: `packages/ui` test files use jest-dom matchers that the UI
package's tsconfig does not load (`@testing-library/jest-dom` types are not
referenced in its tsconfig). The web app's own typecheck is unaffected.
Fix direction: add `import '@testing-library/jest-dom'` to the ui package's
test setup or extend its tsconfig `types` array.
