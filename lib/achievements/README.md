# Achievement System

The achievement system provides a badge/achievement tracking mechanism for players in the Hunty application. Players earn achievements by completing hunts and reaching milestones.

## Overview

The achievement system consists of:

1. **Config** (`config.ts`) - Defines all available achievements with metadata
2. **Service** (`service.ts`) - Handles achievement logic, storage, and checking
3. **BadgeWall Component** (`components/BadgeWall.tsx`) - Displays achievements on player profile
4. **GameCompleteModal Integration** - Awards achievements on hunt completion

## Achievements

### Available Achievements

| ID | Title | Description | Icon | Rarity | Condition |
|---|---|---|---|---|---|
| `first_hunt_completed` | First Steps | Complete your first hunt | 🎯 | Common | Complete 1 hunt |
| `first_win` | Victory Lap | Win your first hunt | 🏆 | Common | Win 1 hunt |
| `five_wins` | Rising Star | Win 5 hunts | ⭐ | Uncommon | Win 5 hunts |
| `ten_wins` | Champion | Win 10 hunts | 👑 | Rare | Win 10 hunts |
| `twenty_five_wins` | Unstoppable | Win 25 hunts | 🔥 | Epic | Win 25 hunts |
| `first_nft` | Collector | Earn your first NFT | 🎨 | Uncommon | Claim 1 NFT reward |
| `high_scorer` | Sharpshooter | Achieve highest score in a month | 🎪 | Rare | Top score in a calendar month |
| `speed_hunter` | Lightning Fast | Complete a hunt in record time | ⚡ | Rare | Complete a hunt in under 5 minutes |
| `veteran` | Veteran | Complete 50 hunts | 🛡️ | Epic | Complete 50 hunts |
| `legend` | Legend | Win 100 hunts | 💎 | Legendary | Win 100 hunts |

### Rarity Levels

- **Common** - Basic achievements, easy to earn
- **Uncommon** - Moderate difficulty
- **Rare** - Challenging achievements
- **Epic** - Very difficult achievements
- **Legendary** - Extremely difficult, prestigious achievements

## Usage

### Checking and Awarding Achievements

```typescript
import { checkAndAwardAchievements } from "@/lib/achievements/service"

// Check and award achievements based on player stats
const newAchievements = checkAndAwardAchievements(playerAddress, {
  totalHuntsCompleted: 5,
  totalHuntsWon: 3,
  totalNftsEarned: 1,
  fastestCompletionSeconds: 250,
})

// newAchievements will contain IDs of newly earned achievements
if (newAchievements.length > 0) {
  console.log("New achievements earned:", newAchievements)
}
```

### Getting Player Achievements

```typescript
import { getAllAchievementsWithStatus, getEarnedAchievements } from "@/lib/achievements/service"

// Get all achievements with earned status
const allAchievements = getAllAchievementsWithStatus(playerAddress)

// Get only earned achievements
const earned = getEarnedAchievements(playerAddress)
```

### Checking Individual Achievements

```typescript
import { hasAchievement } from "@/lib/achievements/service"

if (hasAchievement(playerAddress, "first_hunt_completed")) {
  console.log("Player has completed their first hunt!")
}
```

## Storage

Achievements are stored in the browser's `localStorage` with the key format:
```
hunty_achievements_{playerAddress}
```

Each entry contains:
```typescript
{
  address: string
  earned: Array<{
    id: AchievementId
    earnedAt: number // Unix timestamp
  }>
  lastUpdated: number // Unix timestamp
}
```

## Integration Points

### GameCompleteModal

When a hunt is completed, the `GameCompleteModal` component:
1. Calls `checkAndAwardAchievements()` with the player's stats
2. Displays newly earned achievements in a highlighted section
3. Shows toast notifications for each new achievement

```typescript
// In GameCompleteModal.tsx
const earned = checkAndAwardAchievements(playerAddress, {
  totalHuntsCompleted: 1,
  totalHuntsWon: 1,
  totalNftsEarned: 0,
})

if (earned.length > 0) {
  setNewAchievements(earned)
  earned.forEach((achievementId) => {
    const achievement = ACHIEVEMENTS[achievementId]
    toast.success(`🎉 Achievement Unlocked: ${achievement.title}!`)
  })
}
```

### Profile Page

The `BadgeWall` component displays all achievements on the player profile:
- Shows earned achievements with full color and styling
- Shows unearned achievements grayed out
- Displays achievement metadata on hover (tooltip)
- Shows completion count (e.g., "5 of 10 badges earned")

```typescript
// In profile/page.tsx
<BadgeWall playerAddress={publicKey} />
```

## Testing

The achievement system includes comprehensive tests covering:
- Achievement awarding and retrieval
- Duplicate prevention
- Multiple achievement checking
- Storage and persistence
- Edge cases and error handling

Run tests with:
```bash
npm test -- lib/achievements/service.test.ts
```

All 28 tests pass successfully.

## Future Enhancements

Potential improvements for the achievement system:

1. **Monthly High Scorer** - Implement leaderboard integration to award top scorers
2. **Seasonal Achievements** - Add time-limited achievements
3. **Achievement Tiers** - Allow progression within achievements (e.g., Bronze/Silver/Gold)
4. **Social Sharing** - Let players share achievements on social media
5. **On-Chain Storage** - Store achievements on Soroban for permanent record
6. **Achievement Notifications** - Push notifications when achievements are earned
7. **Achievement Streaks** - Track consecutive wins or completions
8. **Difficulty-Based Achievements** - Award achievements based on hunt difficulty

## Component Props

### BadgeWall

```typescript
interface BadgeWallProps {
  playerAddress: string // Stellar address of the player
}
```

## Type Definitions

```typescript
type AchievementId =
  | "first_hunt_completed"
  | "first_win"
  | "five_wins"
  | "ten_wins"
  | "twenty_five_wins"
  | "first_nft"
  | "high_scorer"
  | "speed_hunter"
  | "veteran"
  | "legend"

interface Achievement {
  id: AchievementId
  title: string
  description: string
  icon: string
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  condition: string
}

interface EarnedAchievement {
  id: AchievementId
  earnedAt: number
}
```

## Styling

The BadgeWall component uses:
- **Tailwind CSS** for styling
- **Gradient backgrounds** for rarity levels
- **Radix UI Tooltip** for achievement details
- **Responsive grid** (2-5 columns depending on screen size)

Rarity color gradients:
- Common: `from-slate-400 to-slate-600`
- Uncommon: `from-green-400 to-green-600`
- Rare: `from-blue-400 to-blue-600`
- Epic: `from-purple-400 to-purple-600`
- Legendary: `from-yellow-400 to-yellow-600`
