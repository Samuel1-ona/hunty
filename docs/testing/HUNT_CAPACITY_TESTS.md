# Hunt capacity tests — issue #1130

The capacity cases extend `apps/web/lib/__tests__/huntStore.test.ts` and import
the real `getHuntCapacity` and `getRemainingSpots` helpers from `huntStore.ts`.
No production capacity calculation was changed.

## Contract and coverage

| Scenario | Expected result |
| --- | --- |
| Both capacity fields omitted | `undefined` capacity and remaining spots (unlimited) |
| Capacity zero, no players | Zero remaining spots |
| Capacity five, three players | Two remaining spots |
| Capacity five, four players | One remaining spot |
| Capacity five, five players | Zero remaining spots (full) |
| Capacity five, six players | Zero remaining spots, never negative |
| Player count omitted | Treat player count as zero |
| Hunt omitted | Both helpers return `undefined` |
| Only legacy `maxCapacity` provided | Use the legacy limit |
| Both limits provided | Prefer `maxParticipants`, including when it is zero |

The last-spot, full, and over-subscription cases run against both capacity fields.
The unlimited cases cover empty and populated hunts. There are 22 new cases.

## Run the tests

From the repository root:

```sh
pnpm --filter @hunty/web test lib/__tests__/huntStore.test.ts
```

For the related hunt suites:

```sh
pnpm --filter @hunty/web test lib/__tests__/hunt
```

## Verification on 2026-08-28

- Hunt-store suite: **93 passed**, including all 22 capacity cases.
- Related hunt suites: **158 passed, 12 failed** across nine files. All failures
  were in `huntAnalytics.test.ts`, where `DATABASE_URL` was not configured.
- Targeted lint could not start because the existing ESLint configuration
  declares `jsxA11y` twice.
- `git diff --check` passed. The full repository suite was not verified.

## Prerequisite repairs included

Testing exposed malformed and duplicate entries in `packages/types/package.json`
and the lockfile, plus a duplicate `totalClues` parameter in `huntStore.ts`.
These were repaired and the stale lockfile was regenerated during dependency
installation. The lockfile refresh is broader than the capacity tests and should
be reviewed separately. Installation used `--ignore-scripts`.

The existing guest-to-wallet migration test also exposed a repeat-call failure.
A migration for a specific hunt now returns its existing wallet progress when
there is no guest entry, preserving the return value after the first migration.
The existing idempotency test passes with this repair.

No database credentials, production configuration changes, or deployment are
included. The database-dependent and lint failures above remain separate from
the completed capacity acceptance criteria.
