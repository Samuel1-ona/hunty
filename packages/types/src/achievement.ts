/**
 * Achievement domain types shared across web and mobile.
 *
 * The concrete achievement catalogue (titles, conditions, unlock logic) lives
 * with each app; this module owns only the shared shape and identifiers.
 */

export type AchievementId =
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

export type AchievementRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"

export interface Achievement {
  id: AchievementId
  title: string
  description: string
  /** Emoji or icon identifier (platform-agnostic string). */
  icon: string
  rarity: AchievementRarity
  /** Human-readable unlock condition. */
  condition: string
}
