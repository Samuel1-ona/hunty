# Achievement System Architecture

## 🏗️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     HUNTY APPLICATION                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
        ┌───────▼────────┐   │   ┌─────────▼────────┐
        │  Game Complete │   │   │  Player Profile  │
        │    Modal       │   │   │     Page         │
        └───────┬────────┘   │   └─────────┬────────┘
                │            │            │
                │            │            │
        ┌───────▼────────────▼────────────▼────────┐
        │   Achievement Service Layer              │
        │  (lib/achievements/service.ts)           │
        │                                          │
        │  • checkAndAwardAchievements()           │
        │  • getEarnedAchievements()               │
        │  • hasAchievement()                      │
        │  • awardAchievement()                    │
        │  • getAllAchievementsWithStatus()        │
        └───────┬────────────────────────────────┘
                │
        ┌───────▼──────────────────────────────┐
        │   Achievement Config                 │
        │  (lib/achievements/config.ts)        │
        │                                      │
        │  • 10 Achievement Definitions        │
        │  • Rarity Levels & Colors            │
        │  • TypeScript Types                  │
        └───────┬──────────────────────────────┘
                │
        ┌───────▼──────────────────────────────┐
        │   Browser localStorage               │
        │  hunty_achievements_{address}        │
        │                                      │
        │  {                                   │
        │    address: string                   │
        │    earned: [{                        │
        │      id: AchievementId               │
        │      earnedAt: timestamp             │
        │    }]                                │
        │    lastUpdated: timestamp            │
        │  }                                   │
        └────────────────────────────────────┘
```

## 🔄 Data Flow Diagram

### Hunt Completion Flow

```
┌──────────────────┐
│  Hunt Completed  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│ GameCompleteModal Opens      │
│ - Confetti animation         │
│ - Fetch registration status  │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ checkAndAwardAchievements()              │
│ Input: playerAddress, stats              │
│ - totalHuntsCompleted                    │
│ - totalHuntsWon                          │
│ - totalNftsEarned                        │
│ - fastestCompletionSeconds               │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ Check Each Achievement Condition         │
│ - first_hunt_completed: >= 1 hunt        │
│ - first_win: >= 1 win                    │
│ - five_wins: >= 5 wins                   │
│ - ... (all 10 achievements)              │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ Award New Achievements                   │
│ - Check if already earned                │
│ - Store in localStorage                  │
│ - Add timestamp                          │
│ - Return newly earned IDs                │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ Show Toast Notifications                 │
│ For each new achievement:                │
│ - 🎉 Achievement Unlocked: {title}!      │
│ - Description                            │
│ - 5 second duration                      │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ Display in Modal                         │
│ - Highlighted section                    │
│ - Achievement icon, title, description   │
│ - Grid layout                            │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ Player Views Profile                     │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ BadgeWall Component Loads                │
│ - getAllAchievementsWithStatus()         │
│ - Render all 10 achievements             │
│ - Earned: full color + gradient          │
│ - Unearned: grayed out                   │
│ - Show "X of Y earned" counter           │
└──────────────────────────────────────────┘
```

## 📦 Component Hierarchy

```
App
├── GameCompleteModal
│   ├── Achievement Checking (service)
│   ├── Toast Notifications (sonner)
│   └── Achievement Display Section
│       └── Achievement Grid
│           └── Achievement Items
│
└── Profile Page
    ├── Player Stats
    ├── NFT Gallery
    ├── BadgeWall Component
    │   ├── Achievement Grid
    │   │   └── Achievement Items (with Tooltip)
    │   │       ├── Icon
    │   │       ├── Title
    │   │       └── Earned Indicator
    │   └── Progress Counter
    └── Hunt History
```

## 🗂️ File Structure

```
hunty/
├── lib/
│   └── achievements/
│       ├── config.ts              # Achievement definitions
│       ├── service.ts             # Core logic
│       ├── service.test.ts        # 28 tests
│       ├── index.ts               # Exports
│       └── README.md              # Documentation
│
├── components/
│   ├── BadgeWall.tsx              # Achievement display
│   └── GameCompleteModal.tsx      # Integration point
│
├── app/
│   └── profile/
│       └── page.tsx               # Profile integration
│
└── Documentation/
    ├── ACHIEVEMENT_SYSTEM_IMPLEMENTATION.md
    ├── ACHIEVEMENT_QUICK_START.md
    ├── ISSUE_381_COMPLETION_REPORT.md
    └── ACHIEVEMENT_ARCHITECTURE.md (this file)
```

## 🔌 Integration Points

### 1. GameCompleteModal Integration

```typescript
// When hunt completes
useEffect(() => {
  if (isOpen && playerAddress) {
    // Award achievements
    const earned = checkAndAwardAchievements(playerAddress, stats)
    
    // Show notifications
    earned.forEach(id => {
      toast.success(`🎉 Achievement Unlocked: ${ACHIEVEMENTS[id].title}!`)
    })
    
    // Display in modal
    setNewAchievements(earned)
  }
}, [isOpen, playerAddress])
```

### 2. Profile Page Integration

```typescript
// Display achievements
<section aria-label="Achievements" className="mt-8">
  <BadgeWall playerAddress={publicKey} />
</section>
```

### 3. Service Layer

```typescript
// Check and award
const earned = checkAndAwardAchievements(address, {
  totalHuntsCompleted: 1,
  totalHuntsWon: 1,
  totalNftsEarned: 0,
  fastestCompletionSeconds: 250,
})
```

## 💾 Storage Architecture

### localStorage Structure

```
Key: hunty_achievements_{playerAddress}

Value: {
  address: "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF3LGYXJJAB7REVOLYTSM",
  earned: [
    {
      id: "first_hunt_completed",
      earnedAt: 1717200000000
    },
    {
      id: "first_win",
      earnedAt: 1717200060000
    },
    {
      id: "five_wins",
      earnedAt: 1717300000000
    }
  ],
  lastUpdated: 1717300000000
}
```

### Storage Lifecycle

```
1. Player completes hunt
   ↓
2. checkAndAwardAchievements() called
   ↓
3. For each new achievement:
   - Check if already earned (read from localStorage)
   - If not earned, add to earned array
   - Update lastUpdated timestamp
   - Write back to localStorage
   ↓
4. Return newly earned achievement IDs
   ↓
5. Show notifications and display
   ↓
6. Player views profile
   ↓
7. BadgeWall reads from localStorage
   ↓
8. Display all achievements with earned status
```

## 🎨 UI Component Architecture

### BadgeWall Component

```
BadgeWall
├── State
│   ├── achievements: Achievement[]
│   └── loading: boolean
│
├── Effects
│   └── Load achievements on mount
│
└── Render
    ├── Loading State
    ├── Card Container
    │   ├── Header
    │   │   ├── Title: "Achievements"
    │   │   └── Counter: "X of Y badges earned"
    │   │
    │   └── Content
    │       ├── Achievement Grid (2-5 columns)
    │       │   └── Achievement Item (x10)
    │       │       ├── Icon (4xl)
    │       │       ├── Title (truncated)
    │       │       ├── Earned Indicator (if earned)
    │       │       └── Tooltip
    │       │           ├── Title
    │       │           ├── Description
    │       │           ├── Condition
    │       │           ├── Earned Date (if earned)
    │       │           └── Rarity
    │       │
    │       └── Empty State (if no achievements)
```

## 🔐 Type System

```typescript
// Achievement Identification
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

// Achievement Metadata
interface Achievement {
  id: AchievementId
  title: string
  description: string
  icon: string
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  condition: string
}

// Earned Achievement Record
interface EarnedAchievement {
  id: AchievementId
  earnedAt: number
}

// Player's Achievement Data
interface PlayerAchievements {
  address: string
  earned: EarnedAchievement[]
  lastUpdated: number
}

// Achievement with Status
interface AchievementWithStatus extends Achievement {
  earned: boolean
  earnedAt?: number
}
```

## 🧪 Test Architecture

```
Achievement Service Tests
├── getEarnedAchievements (3 tests)
│   ├── Empty array when no achievements
│   ├── Returns earned achievements
│   └── Handles corrupted data
│
├── hasAchievement (3 tests)
│   ├── Returns false when not earned
│   ├── Returns true when earned
│   └── Distinguishes achievements
│
├── awardAchievement (4 tests)
│   ├── Awards new achievements
│   ├── Prevents duplicates
│   ├── Stores timestamps
│   └── Awards multiple achievements
│
├── checkAndAwardAchievements (10 tests)
│   ├── Awards each achievement type
│   ├── Prevents re-awarding
│   ├── Awards multiple in one call
│   └── Returns empty when no new
│
├── getAllAchievementsWithStatus (3 tests)
│   ├── Returns all with status
│   ├── Includes earnedAt for earned
│   └── Excludes earnedAt for unearned
│
└── clearAchievements (2 tests)
    ├── Clears all achievements
    └── Doesn't affect other players
```

## 🎯 Achievement Conditions

```
Achievement Conditions Hierarchy:

Level 1 (Common)
├── first_hunt_completed: totalHuntsCompleted >= 1
└── first_win: totalHuntsWon >= 1

Level 2 (Uncommon)
├── five_wins: totalHuntsWon >= 5
└── first_nft: totalNftsEarned >= 1

Level 3 (Rare)
├── ten_wins: totalHuntsWon >= 10
├── high_scorer: monthlyHighScore (leaderboard)
└── speed_hunter: fastestCompletionSeconds <= 300

Level 4 (Epic)
├── twenty_five_wins: totalHuntsWon >= 25
└── veteran: totalHuntsCompleted >= 50

Level 5 (Legendary)
└── legend: totalHuntsWon >= 100
```

## 🔄 State Management Flow

```
Player Action
    ↓
Hunt Completion
    ↓
GameCompleteModal Opens
    ↓
checkAndAwardAchievements()
    ├─ Read from localStorage
    ├─ Check conditions
    ├─ Award new achievements
    └─ Write to localStorage
    ↓
Return newly earned IDs
    ↓
Show Notifications & Display
    ↓
Player Views Profile
    ↓
BadgeWall Component
    ├─ Read from localStorage
    ├─ Get all achievements with status
    └─ Render UI
    ↓
Display Achievements
```

## 🚀 Performance Considerations

- **localStorage Access**: O(1) - Direct key lookup
- **Achievement Checking**: O(10) - Fixed 10 achievements
- **Rendering**: O(10) - Fixed grid of 10 items
- **Memory**: ~1KB per player (localStorage)
- **No Network Calls**: All client-side
- **No Database Queries**: localStorage only

## 🔒 Security Considerations

- ✅ No sensitive data stored
- ✅ Client-side only (no server exposure)
- ✅ Wallet address used as key (player-specific)
- ✅ No authentication bypass possible
- ✅ localStorage is per-domain
- ✅ Can be extended to on-chain for verification

## 📈 Scalability

- **Current**: 10 achievements, 1 player
- **Scalable to**: Unlimited achievements, unlimited players
- **Storage**: ~1KB per player per achievement
- **Performance**: O(1) lookups regardless of scale
- **Future**: Can migrate to Soroban contracts

---

**Architecture Version:** 1.0
**Last Updated:** May 31, 2026
