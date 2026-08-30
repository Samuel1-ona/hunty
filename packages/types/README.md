# @hunty/types

Shared TypeScript domain types for the Hunty **web** (`app/`, `lib/`) and
**mobile** (`mobile/`) apps. Extracting these into one package keeps the two
platforms in sync and removes mobile's dependency on reaching into the web
app's `lib/`.

## What's here

| Module           | Contents                                                                              |
| ---------------- | ------------------------------------------------------------------------------------- |
| `hunt.ts`        | `StoredHunt`, `HuntInfo`, `HuntDraft`, `HuntStatus`, `HuntCategory`, `HuntDifficulty` |
| `clue.ts`        | `Clue`, `ClueInfo`, `ClueRow`, `ClueDifficulty`                                       |
| `player.ts`      | `PlayerProgress`, `PlayerStats`, `PlayerHuntProgress`, `HuntProgressStatus`           |
| `reward.ts`      | `Reward`, `RewardType`, `RewardReceipt`, `RewardHistoryEntry`                         |
| `achievement.ts` | `Achievement`, `AchievementId`, `AchievementRarity`                                   |
| `guards.ts`      | Type guards (`isStoredHunt`, `isClue`, …) and assertions (`assertStoredHunt`, …)      |
| `schemas.ts`     | Zod schemas for runtime validation                                                    |

## Usage

```ts
// Types + dependency-free runtime guards
import { StoredHunt, isStoredHunt, assertClue } from '@hunty/types';

// Zod schemas (opt-in — pulls in `zod`)
import { storedHuntSchema } from '@hunty/types/schemas';

const hunt = storedHuntSchema.parse(await res.json());
```

The main entry (`@hunty/types`) is **dependency-free** so it is safe to import
from the mobile bundle. Zod schemas are isolated behind `@hunty/types/schemas`
so consumers that only need static types never pull in `zod`.

## Resolution

This is a path-aliased workspace folder (no build step), matching the repo's
existing `shared/` convention:

- Web (`tsconfig.json`): `@hunty/types` → `packages/types/src`
- Mobile (`mobile/tsconfig.json` + `babel.config.js`): `@hunty/types` → `../packages/types/src`

The web app's `lib/types.ts` re-exports these domain types, so existing
`@/lib/types` imports continue to work unchanged.
