# Seasonal Leaderboard Implementation

## Overview
This document describes the implementation of seasonal leaderboard cycles with rewards for top players, as specified in issue #614.

## Features Implemented

### 1. Season Configuration
- **Duration, Start/End Times**: Each season has configurable start and end timestamps (Unix seconds)
- **Status Tracking**: Seasons can be "Upcoming", "Active", or "Ended"
- **Reward Configuration**: Top N players receive configurable XLM rewards

### 2. Season Archive
- **Previous Season Results**: When a season ends, the final leaderboard is archived
- **Rank Assignment**: Final ranks are assigned to players based on their position
- **Historical Access**: Archived seasons can be retrieved for historical reference

### 3. Season Rewards
- **Top N Players**: Configurable reward distribution for top positions (1st, 2nd, 3rd, etc.)
- **XLM Rewards**: Rewards are specified in XLM amounts per position
- **Flexible Configuration**: Reward structure can be customized per season

### 4. Season Badges
- **Participant Badges**: Players who participate in a season receive a badge
- **Rank Display**: Badges show the player's final rank when the season ends
- **Badge Storage**: Badges are persisted and can be retrieved per player

### 5. Countdown Timer
- **Real-time Updates**: Live countdown showing time remaining until season end
- **Visual Display**: Shows days, hours, minutes, and seconds
- **Status Indication**: Displays "Season Ended" when the season has concluded

## Architecture

### Data Layer (`lib/seasonStore.ts`)
- **localStorage Persistence**: All season data is stored in localStorage
- **Seed Data**: Includes two seed seasons (Genesis and Rising Stars)
- **CRUD Operations**: Full create, read, update operations for seasons
- **Archive Management**: Separate storage for archived seasons and badges

### API Endpoints

#### `GET /api/v1/seasons`
- Get all seasons or active season only
- Query param `?active=true` for active season only

#### `POST /api/v1/seasons`
- Create a new season (admin only)
- Body: `{ name, startTime, endTime, rewards }`

#### `GET /api/v1/seasons/[id]`
- Get specific season by ID
- Includes leaderboard and time remaining

#### `PATCH /api/v1/seasons/[id]`
- Update season status or other fields (admin only)

#### `POST /api/v1/seasons/[id]/archive`
- Archive a season with final leaderboard
- Body: `{ finalLeaderboard }`

#### `GET /api/v1/seasons/archived`
- Get all archived seasons
- Query param `?id=<seasonId>` for specific archived season

#### `GET /api/v1/seasons/badges`
- Get season badges for a player or all badges
- Query param `?address=<wallet>` for player-specific badges

#### `POST /api/v1/seasons/badges`
- Award a season badge to a player (admin only)

### UI Components

#### `SeasonCountdown`
- Real-time countdown timer
- Auto-updates every second
- Shows days, hours, minutes, seconds
- Displays "Season Ended" when expired

#### `SeasonBadge`
- Displays season badge with rank
- Color-coded ranks (gold, silver, bronze)
- Shows ordinal suffixes (1st, 2nd, 3rd)

#### `SeasonInfo`
- Displays season information card
- Shows name, status, date range
- Optional rewards display
- Integrates countdown for active seasons

### Leaderboard Integration
- **Updated LeaderBoardTable**: Now displays active season information above the leaderboard
- **Season Context**: Shows current season name and countdown when active
- **Seamless Integration**: Existing leaderboard functionality preserved

## Type Definitions (`lib/types.ts`)

```typescript
export type SeasonStatus = "Upcoming" | "Active" | "Ended"

export interface Season {
  id: number
  name: string
  startTime: number
  endTime: number
  status: SeasonStatus
  rewards?: Reward[]
}

export interface SeasonLeaderboardEntry {
  address: string
  name?: string
  points: number
  rank?: number
}

export interface ArchivedSeason {
  season: Season
  finalLeaderboard: SeasonLeaderboardEntry[]
  archivedAt: number
}

export interface SeasonBadge {
  seasonId: number
  seasonName: string
  address: string
  name?: string
  rank?: number
  earnedAt: number
}
```

## Testing

Comprehensive test suite in `lib/__tests__/seasonStore.test.ts`:
- 26 tests covering all season store functions
- Tests for CRUD operations
- Tests for archiving and badges
- Tests for time calculations
- All tests passing

## Usage Example

### Creating a New Season
```typescript
import { createSeason } from "@/lib/seasonStore"

const season = createSeason({
  name: "Season 3: Champions",
  startTime: Math.floor(Date.now() / 1000) + 86400,
  endTime: Math.floor(Date.now() / 1000) + 86400 * 30,
  status: "Upcoming",
  rewards: [
    { place: 1, amount: 1000 },
    { place: 2, amount: 600 },
    { place: 3, amount: 300 },
  ],
})
```

### Archiving a Season
```typescript
import { archiveSeason } from "@/lib/seasonStore"

const finalLeaderboard = [
  { address: "GABC...123", name: "Player1", points: 500 },
  { address: "GDEF...456", name: "Player2", points: 450 },
]

const archived = archiveSeason(seasonId, finalLeaderboard)
```

### Awarding Badges
```typescript
import { awardSeasonBadge } from "@/lib/seasonStore"

const badge = awardSeasonBadge(seasonId, "GABC...123", "Player1", 1)
```

## Future Enhancements

Potential improvements for future iterations:
- Database integration (PostgreSQL/MongoDB) instead of localStorage
- Real-time leaderboard aggregation from hunt completions
- Automated season reset via cron jobs
- Notification system for season end
- Leaderboard filtering by season
- Season-specific achievements
- Multi-tier reward systems (XLM + NFTs)

## Files Created/Modified

### Created
- `lib/seasonStore.ts` - Season data management
- `app/api/v1/seasons/route.ts` - Seasons API endpoints
- `app/api/v1/seasons/[id]/route.ts` - Individual season API
- `app/api/v1/seasons/archived/route.ts` - Archived seasons API
- `app/api/v1/seasons/badges/route.ts` - Season badges API
- `components/SeasonCountdown.tsx` - Countdown timer component
- `components/SeasonBadge.tsx` - Badge display component
- `components/SeasonInfo.tsx` - Season information card
- `lib/__tests__/seasonStore.test.ts` - Test suite

### Modified
- `lib/types.ts` - Added season-related type definitions (already existed)
- `components/LeaderBoardTable.tsx` - Integrated season display

## Acceptance Criteria Met

✅ Season configuration (duration, start/end)
✅ Archive previous season results
✅ Season rewards for top N players
✅ Season badge for participants
✅ Countdown to season end
