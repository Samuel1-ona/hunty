// lib/dailyChallenge.ts (updated grantMilestoneReward)
/**
 * Daily Challenge & Player Streak system.
 * Persists data in localStorage (client‑side) because the project currently has no back‑end DB.
 * The design mirrors existing patterns in `huntStore.ts` (read/write helpers, localStorage keys).
 */

import { getAllHunts } from '@/lib/huntStore'
import { toast } from 'sonner'
// Placeholder import – real implementation would interact with on‑chain reward contracts.
// import { distributeCompletionReward } from '@/lib/contracts/rewardManager'

/** Simple date string used as a day identifier (YYYY‑MM‑DD). */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Daily challenge stored shape. */
export interface DailyChallenge {
  date: string // YYYY‑MM‑DD
  huntId: number
}

/** Player streak information. */
export interface PlayerStreak {
  currentStreak: number
  longestStreak: number
  lastCompletedDate: string // YYYY‑MM‑DD
}

/** Milestone values – only awarded once per player. */
const MILESTONES = [7, 30, 100] as const
export type Milestone = typeof MILESTONES[number]

/** LocalStorage keys (namespaced). */
const DAILY_CHALLENGE_KEY = 'hunty_daily_challenge'
const COMPLETIONS_KEY = 'hunty_daily_completions'
const STREAK_KEY_PREFIX = 'hunty_player_streak_' // + address
const MILESTONE_KEY_PREFIX = 'hunty_player_milestones_' // + address

/** Helper to read JSON from localStorage safely. */
function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as T
    return parsed
  } catch {
    return fallback
  }
}

/** Helper to write JSON to localStorage safely. */
function writeJSON(key: string, value: any): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // swallow – best‑effort persistence
  }
}

/**
 * Retrieve today's daily challenge, creating one if none exists for the current day.
 * The challenge is a random *active* hunt (status === 'Active').
 */
export function getOrCreateTodayChallenge(): DailyChallenge {
  const stored = readJSON<DailyChallenge | null>(DAILY_CHALLENGE_KEY, null)
  const today = todayKey()

  if (stored && stored.date === today) return stored

  // Choose a random active hunt
  const activeHunts = getAllHunts().filter((h) => h.status === 'Active')
  const huntId =
    activeHunts.length > 0 ? activeHunts[Math.floor(Math.random() * activeHunts.length)].id : 0

  const newChallenge: DailyChallenge = { date: today, huntId }
  writeJSON(DAILY_CHALLENGE_KEY, newChallenge)

  // Notify the player that a new challenge is available (in‑app toast).
  toast.success(`New Daily Challenge is now available! Hunt #${huntId}`)
  return newChallenge
}

/**
 * Record that a player (by Stellar address) completed today's challenge.
 * Returns the updated streak and any newly awarded milestones.
 */
export function recordDailyCompletion(address: string): {
  streak: PlayerStreak
  awardedMilestones: Milestone[]
} {
  const today = todayKey()
  const completions = readJSON<Record<string, string>>(COMPLETIONS_KEY, {})

  // Prevent duplicate completion for the same day.
  if (completions[address] === today) {
    const streak = readJSON<PlayerStreak>(
      `${STREAK_KEY_PREFIX}${address}`,
      { currentStreak: 0, longestStreak: 0, lastCompletedDate: '' },
    )
    return { streak, awardedMilestones: [] }
  }

  completions[address] = today
  writeJSON(COMPLETIONS_KEY, completions)

  // Load existing streak data.
  const streakKey = `${STREAK_KEY_PREFIX}${address}`
  const prevStreak = readJSON<PlayerStreak>(streakKey, {
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: '',
  })

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  let newCurrent = 1
  if (prevStreak.lastCompletedDate === today) {
    newCurrent = prevStreak.currentStreak // duplicate safeguard
  } else if (prevStreak.lastCompletedDate === yesterday) {
    newCurrent = prevStreak.currentStreak + 1 // grace period
  }

  const newLongest = Math.max(prevStreak.longestStreak, newCurrent)
  const newStreak: PlayerStreak = {
    currentStreak: newCurrent,
    longestStreak: newLongest,
    lastCompletedDate: today,
  }
  writeJSON(streakKey, newStreak)

  // Determine newly reached milestones.
  const milestoneKey = `${MILESTONE_KEY_PREFIX}${address}`
  const earned: Milestone[] = readJSON<Milestone[]>(milestoneKey, [])
  const newlyEarned: Milestone[] = []
  for (const m of MILESTONES) {
    if (newCurrent >= m && !earned.includes(m)) {
      newlyEarned.push(m)
      earned.push(m)
    }
  }
  if (newlyEarned.length) {
    writeJSON(milestoneKey, earned)
    newlyEarned.forEach((m) => toast.success(`🎉 Streak Milestone reached: ${m} days!`))
  }

  return { streak: newStreak, awardedMilestones: newlyEarned }
}

/** Retrieve a player's streak without mutating state. */
export function getPlayerStreak(address: string): PlayerStreak {
  return readJSON<PlayerStreak>(
    `${STREAK_KEY_PREFIX}${address}`,
    { currentStreak: 0, longestStreak: 0, lastCompletedDate: '' },
  )
}

/**
 * Helper used by UI to warn a player that their streak is at risk.
 * Returns true when the player missed yesterday (i.e., diff >= 2 days).
 */
export function isStreakAtRisk(address: string): boolean {
  const streak = getPlayerStreak(address)
  if (!streak.lastCompletedDate) return false
  const today = todayKey()
  const last = new Date(streak.lastCompletedDate)
  const diffDays = (new Date(today).getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 2 && diffDays < 3
}

/**
 * Placeholder for awarding a milestone reward.
 * In a full implementation this would interact with the on‑chain reward manager.
 */
export function grantMilestoneReward(address: string, milestone: Milestone): void {
  // For now we just surface a toast – real logic can call rewardManager functions.
  toast.info(`Reward for ${milestone}-day streak would be granted to ${address}`)
  // Example (commented) integration:
  // await distributeCompletionReward(<someHuntId>, address)
}
