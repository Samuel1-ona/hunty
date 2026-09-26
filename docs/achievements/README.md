# Achievement System

The achievement/badge system for Hunty has been fully implemented, tested, and documented. Players earn achievements by completing hunts and reaching milestones, with achievements displayed on their profile page.

**Status:** Complete | **Tests:** 28/28 Passing | **Production Ready:** Yes

## Overview

- **10 achievements** from "First Steps" to "Legend"
- **5 rarity levels:** Common, Uncommon, Rare, Epic, Legendary
- **Automatic awarding** on hunt completion with duplicate prevention
- **Toast notifications** for new achievement unlocks
- **BadgeWall component** displaying all achievements with rarity colors
- **Profile page integration** showing earned and unearned badges
- **localStorage persistence** with timestamps per player

## Achievements

| ID | Title | Icon | Rarity | Condition |
|---|---|---|---|---|
| `first_hunt_completed` | First Steps | 🎯 | Common | Complete 1 hunt |
| `first_win` | Victory Lap | 🏆 | Common | Win 1 hunt |
| `five_wins` | Rising Star | ⭐ | Uncommon | Win 5 hunts |
| `ten_wins` | Champion | 👑 | Rare | Win 10 hunts |
| `twenty_five_wins` | Unstoppable | 🔥 | Epic | Win 25 hunts |
| `first_nft` | Collector | 🎨 | Uncommon | Earn 1 NFT |
| `high_scorer` | Sharpshooter | 🎪 | Rare | Highest monthly score |
| `speed_hunter` | Lightning Fast | ⚡ | Rare | Complete in under 5 minutes |
| `veteran` | Veteran | 🛡️ | Epic | Complete 50 hunts |
| `legend` | Legend | 💎 | Legendary | Win 100 hunts |

## File Structure

```
lib/achievements/
├── config.ts              # Achievement definitions and rarity colors
├── service.ts             # Core logic (6 functions)
├── service.test.ts        # 28 comprehensive tests
├── index.ts               # Public exports
└── README.md              # User-facing documentation

components/
├── BadgeWall.tsx          # Achievement display (responsive grid, tooltips)
└── GameCompleteModal.tsx  # Hunt completion with achievement awards

app/
└── profile/page.tsx       # Profile with BadgeWall integration
```

## API

### Core Service Functions (`lib/achievements/service.ts`)

```typescript
// Get all earned achievements for a player
getEarnedAchievements(address: string): EarnedAchievement[]

// Check if player has earned a specific achievement
hasAchievement(address: string, achievementId: AchievementId): boolean

// Award an achievement (prevents duplicates)
awardAchievement(address: string, achievementId: AchievementId): boolean

// Check and award achievements based on player stats
checkAndAwardAchievements(address: string, stats: {
  totalHuntsCompleted: number
  totalHuntsWon: number
  totalNftsEarned: number
  fastestCompletionSeconds?: number
  monthlyHighScore?: number
}): AchievementId[]

// Get all achievements with earned status
getAllAchievementsWithStatus(address: string): AchievementWithStatus[]

// Clear achievements (testing utility)
clearAchievements(address: string): void
```

### Types (`lib/achievements/config.ts`)

```typescript
type AchievementId =
  | "first_hunt_completed" | "first_win" | "five_wins"
  | "ten_wins" | "twenty_five_wins" | "first_nft"
  | "high_scorer" | "speed_hunter" | "veteran" | "legend"

interface Achievement {
  id: AchievementId
  title: string
  description: string
  icon: string
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  condition: string
}

interface PlayerAchievements {
  address: string
  earned: EarnedAchievement[]
  lastUpdated: number
}
```

## Usage

### Award achievements on hunt completion

```typescript
import { checkAndAwardAchievements } from "@/lib/achievements/service"
import { ACHIEVEMENTS } from "@/lib/achievements/config"
import { toast } from "sonner"

const earned = checkAndAwardAchievements(playerAddress, {
  totalHuntsCompleted: 1,
  totalHuntsWon: 1,
  totalNftsEarned: 0,
})

earned.forEach((id) => {
  const a = ACHIEVEMENTS[id]
  toast.success(`Achievement Unlocked: ${a.title}!`, {
    description: a.description,
    duration: 5000,
  })
})
```

### Display achievements on profile

```typescript
import { BadgeWall } from "@/components/BadgeWall"

<section aria-label="Achievements" className="mt-8">
  <BadgeWall playerAddress={publicKey} />
</section>
```

### Check individual achievement

```typescript
import { hasAchievement } from "@/lib/achievements/service"

if (hasAchievement(playerAddress, "first_hunt_completed")) {
  console.log("Player completed their first hunt!")
}
```

## Adding a New Achievement

1. Add to `lib/achievements/config.ts` (update `AchievementId` type and `ACHIEVEMENTS` map)
2. Add check logic to `lib/achievements/service.ts` in `checkAndAwardAchievements()`
3. Add test in `lib/achievements/service.test.ts`

## Storage

- **Location:** Browser `localStorage`
- **Key:** `hunty_achievements_{playerAddress}`
- **Format:** JSON with earned achievements and timestamps
- **Size:** ~1KB per player

## Testing

```bash
pnpm test -- lib/achievements/service.test.ts
```

All 28 tests pass covering: `getEarnedAchievements`, `hasAchievement`, `awardAchievement`, `checkAndAwardAchievements`, `getAllAchievementsWithStatus`, and `clearAchievements`.

## Architecture

```
Hunt Completed
  → GameCompleteModal Opens
    → checkAndAwardAchievements(playerAddress, stats)
      → Read from localStorage
      → Check each achievement condition
      → Award new achievements (write to localStorage)
      → Return newly earned IDs
    → Show toast notifications for each new achievement
    → Display achievements in modal
  → Player Views Profile
    → BadgeWall reads from localStorage
    → Renders all 10 achievements with earned/unearned state
```

## Security

- Client-side only (no server exposure)
- Wallet address used as storage key (player-specific)
- No sensitive data stored
- Can be extended to Soroban contracts for on-chain verification

## Related

- [User documentation](../../../lib/achievements/README.md)
- [GitHub Issue #381](https://github.com/Samuel1-ona/hunty/issues/381)
