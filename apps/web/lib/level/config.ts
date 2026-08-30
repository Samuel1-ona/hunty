/**
 * Level system configuration for the Hunty application.
 * Defines all level tiers with their titles, thresholds, and benefits.
 */

export type LevelTitle = 'Beginner' | 'Explorer' | 'Hunter' | 'Master' | 'Legend';

export interface LevelTier {
  level: number;
  title: LevelTitle;
  xpRequired: number;
  icon: string;
  color: string;
  benefits: string[];
}

export const LEVEL_TIERS: LevelTier[] = [
  {
    level: 1,
    title: 'Beginner',
    xpRequired: 0,
    icon: '🌱',
    color: 'from-green-400 to-green-600',
    benefits: ['Basic hunt access'],
  },
  {
    level: 2,
    title: 'Explorer',
    xpRequired: 100,
    icon: '🧭',
    color: 'from-blue-400 to-blue-600',
    benefits: ['Basic hunt access', 'Early access to some featured hunts'],
  },
  {
    level: 3,
    title: 'Hunter',
    xpRequired: 500,
    icon: '🎯',
    color: 'from-purple-400 to-purple-600',
    benefits: ['Basic hunt access', 'Early access to some featured hunts', 'Priority support'],
  },
  {
    level: 4,
    title: 'Master',
    xpRequired: 2000,
    icon: '👑',
    color: 'from-orange-400 to-orange-600',
    benefits: [
      'Basic hunt access',
      'Early access to most featured hunts',
      'Priority support',
      'Exclusive badge',
    ],
  },
  {
    level: 5,
    title: 'Legend',
    xpRequired: 5000,
    icon: '💎',
    color: 'from-yellow-400 to-yellow-600',
    benefits: [
      'Basic hunt access',
      'Early access to all featured hunts',
      'Priority support',
      'Exclusive badge',
      'Custom profile icon',
    ],
  },
];

/**
 * Calculate XP earned from a hunt completion based on difficulty
 */
export function calculateXpFromHunt(points: number, difficulty?: string): number {
  let multiplier = 1;
  switch (difficulty) {
    case 'Hard':
      multiplier = 2;
      break;
    case 'Medium':
      multiplier = 1.5;
      break;
    case 'Easy':
    default:
      multiplier = 1;
  }
  return Math.floor(points * multiplier);
}
