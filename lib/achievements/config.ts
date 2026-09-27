/**
 * Achievement configuration for the Hunty application.
 * Defines all available achievements with their conditions and metadata.
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

export interface Achievement {
  id: AchievementId
  title: string
  description: string
  icon: string // Emoji or icon identifier
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  condition: string // Human-readable condition
}

export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  first_hunt_completed: {
    id: "first_hunt_completed",
    title: "First Steps",
    description: "Complete your first hunt",
    icon: "🎯",
    rarity: "common",
    condition: "Complete 1 hunt",
  },
  first_win: {
    id: "first_win",
    title: "Victory Lap",
    description: "Win your first hunt",
    icon: "🏆",
    rarity: "common",
    condition: "Win 1 hunt",
  },
  five_wins: {
    id: "five_wins",
    title: "Rising Star",
    description: "Win 5 hunts",
    icon: "⭐",
    rarity: "uncommon",
    condition: "Win 5 hunts",
  },
  ten_wins: {
    id: "ten_wins",
    title: "Champion",
    description: "Win 10 hunts",
    icon: "👑",
    rarity: "rare",
    condition: "Win 10 hunts",
  },
  twenty_five_wins: {
    id: "twenty_five_wins",
    title: "Unstoppable",
    description: "Win 25 hunts",
    icon: "🔥",
    rarity: "epic",
    condition: "Win 25 hunts",
  },
  first_nft: {
    id: "first_nft",
    title: "Collector",
    description: "Earn your first NFT",
    icon: "🎨",
    rarity: "uncommon",
    condition: "Claim 1 NFT reward",
  },
  high_scorer: {
    id: "high_scorer",
    title: "Sharpshooter",
    description: "Achieve highest score in a month",
    icon: "🎪",
    rarity: "rare",
    condition: "Top score in a calendar month",
  },
  speed_hunter: {
    id: "speed_hunter",
    title: "Lightning Fast",
    description: "Complete a hunt in record time",
    icon: "⚡",
    rarity: "rare",
    condition: "Complete a hunt in under 5 minutes",
  },
  veteran: {
    id: "veteran",
    title: "Veteran",
    description: "Complete 50 hunts",
    icon: "🛡️",
    rarity: "epic",
    condition: "Complete 50 hunts",
  },
  legend: {
    id: "legend",
    title: "Legend",
    description: "Win 100 hunts",
    icon: "💎",
    rarity: "legendary",
    condition: "Win 100 hunts",
  },
}

export const RARITY_COLORS: Record<Achievement["rarity"], string> = {
  common: "from-slate-400 to-slate-600",
  uncommon: "from-green-400 to-green-600",
  rare: "from-blue-400 to-blue-600",
  epic: "from-purple-400 to-purple-600",
  legendary: "from-yellow-400 to-yellow-600",
}

export const RARITY_BORDER_COLORS: Record<Achievement["rarity"], string> = {
  common: "border-slate-400",
  uncommon: "border-green-400",
  rare: "border-blue-400",
  epic: "border-purple-400",
  legendary: "border-yellow-400",
}
