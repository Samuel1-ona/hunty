import { faker } from "@faker-js/faker"

import type { Clue, HuntStatus, StoredHunt } from "@/lib/types"

export interface TestPlayer {
  name: string
  address: string
  points: number
  completedHunts: number
  joinedAt: number
}

type HuntFactoryOverrides = Partial<StoredHunt>
type ClueFactoryOverrides = Partial<Clue> & { huntId?: number }
type PlayerFactoryOverrides = Partial<TestPlayer> & {
  name?: string
  address?: string
  points?: number
  completedHunts?: number
  joinedAt?: number
}

type SeedTestDataOptions = {
  huntOverrides?: HuntFactoryOverrides
  clueOverrides?: ClueFactoryOverrides
  playerOverrides?: PlayerFactoryOverrides
  clueCount?: number
}

export function createHunt(overrides: HuntFactoryOverrides = {}): StoredHunt {
  const now = Math.floor(Date.now() / 1000)
  const startTime = overrides.startTime ?? now - faker.number.int({ min: 1800, max: 7 * 86400 })
  const endTime = overrides.endTime ?? startTime + faker.number.int({ min: 2 * 86400, max: 10 * 86400 })

  return {
    id: overrides.id ?? faker.number.int({ min: 100, max: 99999 }),
    title: overrides.title ?? `${faker.lorem.word()} ${faker.lorem.word()} Hunt`,
    description: overrides.description ?? faker.lorem.sentence(8),
    cluesCount: overrides.cluesCount ?? faker.number.int({ min: 3, max: 8 }),
    status: overrides.status ?? faker.helpers.arrayElement(["Active", "Draft", "Completed", "Cancelled"] as const),
    rewardType: overrides.rewardType ?? faker.helpers.arrayElement(["XLM", "NFT", "Both"] as const),
    rewardPool: overrides.rewardPool ?? faker.number.int({ min: 50, max: 500 }),
    playerCount: overrides.playerCount ?? faker.number.int({ min: 0, max: 100 }),
    createdAt: overrides.createdAt ?? now - faker.number.int({ min: 600, max: 7 * 86400 }),
    startTime,
    endTime,
    creatorEmail: overrides.creatorEmail ?? faker.internet.email(),
    emailNotifications: overrides.emailNotifications ?? faker.datatype.boolean(),
    is_private: overrides.is_private ?? false,
    coverImageCid: overrides.coverImageCid ?? faker.image.url(),
    isFeaturedOfWeek: overrides.isFeaturedOfWeek ?? false,
    ...overrides,
  }
}

export function createClue(overrides: ClueFactoryOverrides = {}): Clue {
  return {
    id: overrides.id ?? faker.number.int({ min: 1, max: 9999 }),
    huntId: overrides.huntId ?? faker.number.int({ min: 1, max: 9999 }),
    question: overrides.question ?? faker.lorem.sentence(6),
    answer: overrides.answer ?? faker.lorem.word(),
    points: overrides.points ?? faker.number.int({ min: 10, max: 50 }),
    hint: overrides.hint ?? faker.lorem.sentence(8),
    hintCost: overrides.hintCost ?? faker.number.int({ min: 5, max: 20 }),
    difficulty: overrides.difficulty ?? faker.helpers.arrayElement(["Easy", "Medium", "Hard"] as const),
    latitude: overrides.latitude ?? faker.location.latitude(),
    longitude: overrides.longitude ?? faker.location.longitude(),
    geofenceRadiusMeters: overrides.geofenceRadiusMeters ?? faker.number.int({ min: 50, max: 250 }),
    ...overrides,
  }
}

export function createPlayer(overrides: PlayerFactoryOverrides = {}): TestPlayer {
  return {
    name: overrides.name ?? faker.person.fullName(),
    address: overrides.address ?? `G${faker.string.alphanumeric({ length: 55, casing: "upper" })}`,
    points: overrides.points ?? faker.number.int({ min: 0, max: 1000 }),
    completedHunts: overrides.completedHunts ?? faker.number.int({ min: 0, max: 20 }),
    joinedAt: overrides.joinedAt ?? Math.floor(Date.now() / 1000) - faker.number.int({ min: 86400, max: 30 * 86400 }),
    ...overrides,
  }
}

export function createSharedFixtures() {
  const activeHunt = createHunt({
    status: "Active",
    title: "Active Fixture Hunt",
    cluesCount: 3,
    rewardType: "XLM",
  })

  const completedHunt = createHunt({
    status: "Completed",
    title: "Completed Fixture Hunt",
    cluesCount: 2,
    rewardType: "NFT",
  })

  const draftHunt = createHunt({
    status: "Draft",
    title: "Draft Fixture Hunt",
    cluesCount: 0,
    rewardType: "Both",
  })

  const activeClues = [
    createClue({ huntId: activeHunt.id, question: "Where does the trail begin?", answer: "river" }),
    createClue({ huntId: activeHunt.id, question: "What color is the beacon?", answer: "blue" }),
    createClue({ huntId: activeHunt.id, question: "Which landmark is hidden nearby?", answer: "statue" }),
  ]

  return {
    activeScenario: {
      hunt: activeHunt,
      clues: activeClues,
      player: createPlayer({ name: "Nova Player" }),
    },
    completedScenario: {
      hunt: completedHunt,
      clues: [createClue({ huntId: completedHunt.id, question: "Where was the reward hidden?", answer: "garden" })],
      player: createPlayer({ name: "Completed Player" }),
    },
    draftScenario: {
      hunt: draftHunt,
      clues: [],
      player: createPlayer({ name: "Draft Player" }),
    },
  }
}

export function seedTestData(options: SeedTestDataOptions = {}) {
  const hunt = createHunt(options.huntOverrides)
  const clueCount = options.clueCount ?? 3
  const clues = Array.from({ length: clueCount }, (_, index) =>
    createClue({
      id: index + 1,
      huntId: hunt.id,
      ...options.clueOverrides,
    })
  )
  const player = createPlayer(options.playerOverrides)

  if (typeof window !== "undefined") {
    window.localStorage.setItem("hunty_hunts", JSON.stringify([hunt]))
    window.localStorage.setItem("hunty_clues", JSON.stringify(clues))
  }

  return {
    hunt,
    hunts: [hunt],
    clues,
    player,
  }
}
