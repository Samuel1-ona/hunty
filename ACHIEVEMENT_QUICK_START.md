# Achievement System - Quick Start Guide

## 🎯 What is the Achievement System?

A badge/achievement system that rewards players for completing hunts and reaching milestones. Players earn achievements automatically when they complete hunts, and can view all their achievements on their profile page.

## 📦 What's Included?

- **10 Achievements** - From "First Steps" to "Legend"
- **Automatic Awarding** - Achievements awarded on hunt completion
- **Visual Display** - BadgeWall component shows all achievements
- **Toast Notifications** - Celebrate new achievements
- **Profile Integration** - View achievements on player profile
- **28 Tests** - Comprehensive test coverage

## 🚀 Quick Usage

### 1. Award Achievements on Hunt Completion

In `GameCompleteModal.tsx` (already implemented):

```typescript
import { checkAndAwardAchievements } from "@/lib/achievements/service"
import { ACHIEVEMENTS } from "@/lib/achievements/config"
import { toast } from "sonner"

// When hunt completes
const earned = checkAndAwardAchievements(playerAddress, {
  totalHuntsCompleted: 1,
  totalHuntsWon: 1,
  totalNftsEarned: 0,
  fastestCompletionSeconds: 250,
})

// Show toast for each new achievement
earned.forEach((achievementId) => {
  const achievement = ACHIEVEMENTS[achievementId]
  toast.success(`🎉 Achievement Unlocked: ${achievement.title}!`, {
    description: achievement.description,
    duration: 5000,
  })
})
```

### 2. Display Achievements on Profile

In `app/profile/page.tsx` (already implemented):

```typescript
import { BadgeWall } from "@/components/BadgeWall"

<section aria-label="Achievements" className="mt-8">
  <BadgeWall playerAddress={publicKey} />
</section>
```

### 3. Check Individual Achievement

```typescript
import { hasAchievement } from "@/lib/achievements/service"

if (hasAchievement(playerAddress, "first_hunt_completed")) {
  console.log("Player has completed their first hunt!")
}
```

### 4. Get All Achievements with Status

```typescript
import { getAllAchievementsWithStatus } from "@/lib/achievements/service"

const allAchievements = getAllAchievementsWithStatus(playerAddress)
// Returns array with earned status for each achievement
```

## 📋 Available Achievements

```typescript
type AchievementId =
  | "first_hunt_completed"  // Complete 1 hunt
  | "first_win"             // Win 1 hunt
  | "five_wins"             // Win 5 hunts
  | "ten_wins"              // Win 10 hunts
  | "twenty_five_wins"      // Win 25 hunts
  | "first_nft"             // Earn 1 NFT
  | "high_scorer"           // Top score in a month
  | "speed_hunter"          // Complete hunt in <5 min
  | "veteran"               // Complete 50 hunts
  | "legend"                // Win 100 hunts
```

## 🎨 Achievement Rarities

```typescript
type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary"
```

Each rarity has a unique color gradient:
- **Common** (slate) - Basic achievements
- **Uncommon** (green) - Moderate difficulty
- **Rare** (blue) - Challenging
- **Epic** (purple) - Very difficult
- **Legendary** (yellow) - Extremely difficult

## 💾 Storage

Achievements are stored in browser localStorage:
- Key: `hunty_achievements_{playerAddress}`
- Format: JSON with earned achievements and timestamps
- Persists across sessions
- Can be extended to Soroban contracts

## 🧪 Testing

Run achievement tests:

```bash
npm test -- lib/achievements/service.test.ts
```

All 28 tests should pass ✅

## 📁 File Locations

```
lib/achievements/
├── config.ts              # Achievement definitions
├── service.ts             # Core logic
├── service.test.ts        # Tests
├── index.ts               # Exports
└── README.md              # Full documentation

components/
├── BadgeWall.tsx          # Achievement display
└── GameCompleteModal.tsx  # Integration point

app/
└── profile/page.tsx       # Profile integration
```

## 🔧 Adding a New Achievement

1. **Add to config.ts:**

```typescript
export type AchievementId =
  | "first_hunt_completed"
  | "first_win"
  // ... existing achievements
  | "new_achievement"  // Add here

export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  // ... existing achievements
  new_achievement: {
    id: "new_achievement",
    title: "Achievement Title",
    description: "Achievement description",
    icon: "🎯",
    rarity: "rare",
    condition: "Condition to earn this",
  },
}
```

2. **Add logic to service.ts:**

```typescript
export function checkAndAwardAchievements(
  address: string,
  stats: { /* ... */ }
): AchievementId[] {
  // ... existing checks
  
  // New achievement check
  if (stats.someCondition && !hasAchievement(address, "new_achievement")) {
    if (awardAchievement(address, "new_achievement")) {
      newAchievements.push("new_achievement")
    }
  }
  
  return newAchievements
}
```

3. **Add test in service.test.ts:**

```typescript
it("should award new_achievement when condition is met", () => {
  const newAchievements = checkAndAwardAchievements(testAddress, {
    // ... stats that trigger condition
  })

  expect(newAchievements).toContain("new_achievement")
  expect(hasAchievement(testAddress, "new_achievement")).toBe(true)
})
```

## 🎯 Common Tasks

### Get player's earned achievements count

```typescript
import { getEarnedAchievements } from "@/lib/achievements/service"

const earned = getEarnedAchievements(playerAddress)
console.log(`Player has earned ${earned.length} achievements`)
```

### Check if player is a "Legend"

```typescript
import { hasAchievement } from "@/lib/achievements/service"

const isLegend = hasAchievement(playerAddress, "legend")
if (isLegend) {
  // Show special badge or status
}
```

### Clear achievements (testing only)

```typescript
import { clearAchievements } from "@/lib/achievements/service"

clearAchievements(playerAddress) // Removes all achievements
```

## 🐛 Troubleshooting

### Achievements not showing up

1. Check browser localStorage is enabled
2. Verify player address is correct
3. Check console for errors
4. Clear localStorage and try again

### Toast notifications not appearing

1. Verify `sonner` is imported: `import { toast } from "sonner"`
2. Check that `checkAndAwardAchievements` returns achievements
3. Verify achievement exists in `ACHIEVEMENTS` config

### BadgeWall not displaying

1. Ensure `playerAddress` prop is passed
2. Check that player has connected wallet
3. Verify component is in correct location on profile page

## 📚 Related Files

- **README.md** - Full documentation
- **ACHIEVEMENT_SYSTEM_IMPLEMENTATION.md** - Detailed implementation guide
- **service.test.ts** - Test examples and patterns

## 🎓 Key Concepts

- **Achievement ID**: Unique identifier for each achievement
- **Rarity**: Visual distinction (common to legendary)
- **Earned**: Whether player has unlocked this achievement
- **Timestamp**: When achievement was earned
- **Storage**: localStorage with player address as key

## ✨ Features

✅ Automatic awarding on hunt completion
✅ Toast notifications for new achievements
✅ Visual display with rarity colors
✅ Tooltip details on hover
✅ Progress tracking (X of Y earned)
✅ Responsive design
✅ Dark mode support
✅ Full test coverage

## 🚀 Next Steps

1. Test the system by completing hunts
2. View achievements on profile page
3. Check console for any errors
4. Run tests to verify everything works
5. Extend with new achievements as needed

---

**Need Help?** Check the full documentation in `lib/achievements/README.md`
