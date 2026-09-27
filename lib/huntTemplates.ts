import type { HuntDraft } from "@/lib/types"

export interface HuntTemplateClue {
  title: string
  description: string
  code: string
  link?: string
}

export interface HuntTemplate {
  slug: string
  title: string
  description: string
  category: string
  estimatedDuration: string
  clues: HuntTemplateClue[]
}

export const STARTER_HUNT_TEMPLATES: HuntTemplate[] = [
  {
    slug: "city-walking-tour",
    title: "City Walking Tour",
    description: "Guide players through murals, landmarks, and hidden corners in a downtown walking loop.",
    category: "Outdoor",
    estimatedDuration: "45-60 min",
    clues: [
      {
        title: "Mural at Sunrise Alley",
        description: "Find the alley mural with the giant orange sun and note the year painted in the corner.",
        code: "2019",
      },
      {
        title: "Clocktower Countdown",
        description: "Head to the old clocktower and enter the number shown on the face nearest the market square.",
        code: "12",
      },
      {
        title: "Bridge With the Brass Plaque",
        description: "Cross the pedestrian bridge and use the surname engraved on the brass dedication plaque.",
        code: "adeyemi",
      },
    ],
  },
  {
    slug: "office-scavenger-hunt",
    title: "Office Scavenger Hunt",
    description: "Help new teammates learn key spaces, people, and culture rituals around the office.",
    category: "Onboarding",
    estimatedDuration: "20-30 min",
    clues: [
      {
        title: "Welcome Wall",
        description: "Visit the team welcome wall and enter the final word from the mission statement.",
        code: "builders",
      },
      {
        title: "Snack Station Survey",
        description: "Check the kitchen snack station and enter the flavor listed on the top row of tea boxes.",
        code: "ginger",
      },
      {
        title: "Conference Room Cipher",
        description: "Find the room named after a city and enter the city name from the door plaque.",
        code: "lagos",
      },
    ],
  },
  {
    slug: "crypto-trivia-sprint",
    title: "Crypto Trivia Sprint",
    description: "Kick off a web3 event with fast, beginner-friendly trivia clues that teach while players compete.",
    category: "Trivia",
    estimatedDuration: "15-20 min",
    clues: [
      {
        title: "Genesis Block",
        description: "What word describes the very first block added to a blockchain network?",
        code: "genesis",
      },
      {
        title: "Wallet Basics",
        description: "Enter the term for the private credential you must never share with anyone.",
        code: "seed phrase",
      },
      {
        title: "Consensus Check",
        description: "What is the process called when a network agrees that transactions are valid?",
        code: "consensus",
      },
    ],
  },
  {
    slug: "campus-welcome-quest",
    title: "Campus Welcome Quest",
    description: "Show new students around must-know spots like the library, student center, and help desk.",
    category: "Campus",
    estimatedDuration: "30-40 min",
    clues: [
      {
        title: "Library Launch",
        description: "Find the library entrance banner and enter the last word in the reading campaign slogan.",
        code: "discover",
      },
      {
        title: "Student Center Stop",
        description: "Walk to the student center and use the room number on the careers office sign.",
        code: "214",
      },
      {
        title: "Mascot Moment",
        description: "Take a photo by the mascot statue and enter the mascot nickname written on the base.",
        code: "falcons",
      },
    ],
  },
  {
    slug: "museum-mystery",
    title: "Museum Mystery",
    description: "Turn a gallery visit into a playful puzzle trail across artifacts, portraits, and exhibit labels.",
    category: "Indoor",
    estimatedDuration: "35-50 min",
    clues: [
      {
        title: "Portrait Puzzle",
        description: "Locate the oldest portrait in the west gallery and enter the sitter's last name.",
        code: "balewa",
      },
      {
        title: "Artifact Number",
        description: "Find the bronze mask exhibit and type the accession number shown beneath it.",
        code: "1842",
      },
      {
        title: "Curator's Choice",
        description: "Read the curator note near the final room and enter the one-word theme highlighted in bold.",
        code: "memory",
      },
    ],
  },
  {
    slug: "foodie-neighborhood-crawl",
    title: "Foodie Neighborhood Crawl",
    description: "Send players across cafes, bakeries, and street-food spots for a social tasting adventure.",
    category: "Community",
    estimatedDuration: "40-55 min",
    clues: [
      {
        title: "Cafe Counter Clue",
        description: "Visit the first cafe and enter the pastry name written on the chalkboard special.",
        code: "croissant",
      },
      {
        title: "Market Spice Trail",
        description: "At the spice stall, use the word printed on the jar with the brightest yellow label.",
        code: "turmeric",
      },
      {
        title: "Dessert Finale",
        description: "Finish at the dessert stop and enter the topping listed first on the signature sundae menu.",
        code: "almonds",
      },
    ],
  },
]

export function getStarterTemplateBySlug(slug: string): HuntTemplate | undefined {
  return STARTER_HUNT_TEMPLATES.find((template) => template.slug === slug)
}

export function buildDraftHuntsFromTemplate(template: HuntTemplate): HuntDraft[] {
  return template.clues.map((clue, index) => ({
    id: index + 1,
    title: clue.title,
    description: clue.description,
    link: clue.link ?? "",
    code: clue.code,
    image: "",
  }))
}
