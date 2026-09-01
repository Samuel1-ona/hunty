/**
 * Predefined hunt categories with icons and colors for discovery/filtering.
 */

export type HuntCategoryId =
  | "adventure"
  | "education"
  | "city"
  | "nature"
  | "history"
  | "food"
  | "art"
  | "sports"
  | "mystery"
  | "family"

export interface HuntCategory {
  id: HuntCategoryId
  label: string
  /** Lucide-style icon name used by UI components */
  icon: string
  /** Tailwind-friendly hex accent */
  color: string
  /** Soft background tint */
  bgColor: string
  description: string
}

export const HUNT_CATEGORIES: HuntCategory[] = [
  {
    id: "adventure",
    label: "Adventure",
    icon: "Compass",
    color: "#0D9488",
    bgColor: "#CCFBF1",
    description: "Outdoor challenges and exploratory quests",
  },
  {
    id: "education",
    label: "Education",
    icon: "GraduationCap",
    color: "#2563EB",
    bgColor: "#DBEAFE",
    description: "Learning-focused scavenger hunts",
  },
  {
    id: "city",
    label: "City",
    icon: "Building2",
    color: "#7C3AED",
    bgColor: "#EDE9FE",
    description: "Urban landmarks and street discoveries",
  },
  {
    id: "nature",
    label: "Nature",
    icon: "Trees",
    color: "#16A34A",
    bgColor: "#DCFCE7",
    description: "Parks, trails, and outdoor wildlife",
  },
  {
    id: "history",
    label: "History",
    icon: "Landmark",
    color: "#B45309",
    bgColor: "#FEF3C7",
    description: "Historical sites and heritage walks",
  },
  {
    id: "food",
    label: "Food",
    icon: "UtensilsCrossed",
    color: "#DC2626",
    bgColor: "#FEE2E2",
    description: "Culinary trails and tasting challenges",
  },
  {
    id: "art",
    label: "Art",
    icon: "Palette",
    color: "#DB2777",
    bgColor: "#FCE7F3",
    description: "Galleries, murals, and creative spots",
  },
  {
    id: "sports",
    label: "Sports",
    icon: "Trophy",
    color: "#EA580C",
    bgColor: "#FFEDD5",
    description: "Athletic venues and fitness challenges",
  },
  {
    id: "mystery",
    label: "Mystery",
    icon: "Search",
    color: "#475569",
    bgColor: "#F1F5F9",
    description: "Puzzle-heavy detective style hunts",
  },
  {
    id: "family",
    label: "Family",
    icon: "Users",
    color: "#0891B2",
    bgColor: "#CFFAFE",
    description: "Kid-friendly group adventures",
  },
]

const BY_ID = new Map(HUNT_CATEGORIES.map((c) => [c.id, c]))

export function getCategory(id: HuntCategoryId | string | undefined): HuntCategory | undefined {
  if (!id) return undefined
  return BY_ID.get(id as HuntCategoryId)
}

export function isHuntCategoryId(value: string): value is HuntCategoryId {
  return BY_ID.has(value as HuntCategoryId)
}

export function getCategoryLabel(id: HuntCategoryId | string | undefined): string {
  return getCategory(id)?.label ?? "Uncategorized"
}
