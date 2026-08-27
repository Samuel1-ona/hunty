# Architecture Overview

> How Hunty is structured, who owns what, and how data flows from the UI to
> on-chain contracts. Generated from the actual workspace layout (#1147).

## Workspaces

This is a pnpm + Turborepo monorepo:

| Workspace | Purpose | Key contents |
|---|---|---|
| `apps/web` | Next.js web application | `app/` (App Router pages + API routes), `lib/` (domain logic), `components/` |
| `apps/mobile` | Mobile client | `lib/`, `store/`, `services/`, GraphQL queries |
| `packages/types` | **Shared types — single source of truth** (`@hunty/types`) | `clue.ts`, `hunt.ts`, `achievement.ts`, `api-schemas.ts`, `guards.ts` |
| `packages/config` | Shared configuration (`@hunty/config`) | lint/tsconfig presets |
| `packages/ui` | Shared UI components (`@hunty/ui`) | `hooks/`, `native/`, `tokens/` |

**Who owns shared types:** `packages/types` is the only place where cross-app
types live. Both apps import them via `@hunty/types` (e.g. `api-schemas.ts`
holds the request/response schemas used by `withValidation` in web API routes).

## Module map (apps/web)

- `app/api/v1/*` — REST API surface: `answers`, `drafts`, `feature-flags`,
  `hunts` (incl. `[id]` sub-actions and `bulk`), `seasons`, `tags`, `time`
- `lib/huntStore.ts` — local persistence of hunts/clues (localStorage-backed)
- `lib/clueAnswerValidation.ts` / `clueAnswerVerification.ts` — answer checking
- `lib/anti-cheat.ts` (+ data) — integrity enforcement
- `lib/analytics.ts` — usage analytics
- `lib/contracts/` — Soroban contract bindings
- `lib/collaboration.ts`, `lib/communityTemplates.ts` — social features

## Data flow: UI → contract

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  UI layer    │     │  Domain logic     │     │  Persistence /   │
│  components  │ --> │  apps/web/lib/*   │ --> │  chain            │
│  app/**      │     │  huntStore,       │     │  localStorage,    │
│              │     │  clueAnswer*      │     │  API v1 routes,   │
│              │     │  anti-cheat       │     │  Soroban contracts│
└─────────────┘     └──────────────────┘     └─────────────────┘
        ▲                    ▲                         │
        └────── @hunty/types (shared schemas & guards) ◄┘
```

1. Pages/components under `apps/web/app/**` call into domain modules in `lib/`.
2. Domain modules validate with shared schemas/guards from `@hunty/types`.
3. Local-first features persist to `localStorage` via `huntStore`;
   server features call `/api/v1/*`; value-bearing actions settle through
   Soroban contracts via `lib/contracts/`.

## Rules for contributors

- Cross-app type? → add it to `packages/types`, never duplicate in an app.
- New API route? → schema goes in `packages/types/src/api-schemas.ts`, route
  validates via `withValidation`.
- UI primitive reused across apps? → `packages/ui`.
