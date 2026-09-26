# Next.js ESLint version pinning

`eslint-config-next` and `@next/eslint-plugin-next` are published in lockstep
with `next`. Their rule sets reference internals of the matching Next release, so
a config built for a different version can enable rules the installed runtime
does not implement (or miss rules that it does).

To keep the three from drifting, the monorepo treats them as **one version
unit**: they must always be pinned to the exact same version, and Renovate bumps
them in a single PR.

## Where the pins live

| Package | Manifest | Field |
| --- | --- | --- |
| `next` | `package.json`, `apps/web/package.json` | `dependencies` |
| `eslint-config-next` | `package.json`, `apps/web/package.json`, `packages/config/package.json` | `devDependencies` |
| `@next/eslint-plugin-next` | `packages/config/package.json` | `devDependencies` |

All of them are exact pins (no `^` / `~`). `packages/config` owns the shared
`@hunty/config/eslint/next` preset that consumes both ESLint packages, which is
why the plugin is pinned there rather than in `apps/web`.

## The invariant

> `next`, `eslint-config-next` and `@next/eslint-plugin-next` resolve to the same
> version across every workspace manifest.

Two mechanisms keep that true:

1. **Renovate group** — `renovate.json` → `packageRules` → `"next.js packages"`
   matches all three names (and sets `rangeStrategy: "pin"`), so a Next upgrade
   arrives as one PR containing the runtime and its ESLint packages together.
   Automerge is off, because a Next bump is reviewed deliberately.
2. **Pin guard** — `packages/config/scripts/check-next-eslint-pins.mjs` reads the
   workspace manifests and fails when the versions differ, when one of the three
   packages is missing, or when an ESLint package is no longer an exact pin.
   It runs:

   ```bash
   node packages/config/scripts/check-next-eslint-pins.mjs   # also via `pnpm --filter @hunty/config test`
   ```

   and in its own workflow, [`.github/workflows/next-eslint-pins.yml`](../../.github/workflows/next-eslint-pins.yml),
   which additionally self-checks that a deliberately mismatched pin does fail
   the script.

## Upgrading Next

Bump all three at once and regenerate the lockfile:

```bash
pnpm --filter @hunty/web add next@<version>
pnpm add -D -w eslint-config-next@<version>
pnpm --filter @hunty/config add -D eslint-config-next@<version> @next/eslint-plugin-next@<version>
pnpm install
node packages/config/scripts/check-next-eslint-pins.mjs
```

The Next runtime upgrade itself is tracked separately in
[#1236](https://github.com/Samuel1-ona/hunty/issues/1236); whenever it lands, the
ESLint packages must land with it in the same PR.
