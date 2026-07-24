# Agent Commands

## Lint and Type Check
- `pnpm lint` - Run ESLint
- `npx tsc --noEmit` - TypeScript type check

## Testing
- `pnpm test` - Run Vitest unit tests
- `pnpm test:coverage` - Run Vitest with coverage
- `pnpm test:e2e` - Run Playwright E2E tests
- `pnpm test:e2e:ui` - Run Playwright with UI mode
- `pnpm test:visual` - Run visual regression tests
- `pnpm test:visual:update` - Update visual baseline snapshots

## Build
- `pnpm build` - Build Next.js application
- `pnpm dev` - Start development server