/** Shared localStorage access and seed data for the hunt store modules. */

import { migrateHuntScheduleFieldsInCollection } from "@/lib/huntScheduleMigration";
import type { Clue, HuntInvite, HuntStatus, StoredHunt } from "@/lib/types";

export type { Clue, HuntInvite, HuntStatus, StoredHunt };

export type HuntInviteValidation =
  | { isValid: true; reason: "public" | "valid" }
  | { isValid: false; reason: "required" | "invalid" | "expired" };

export type HuntStoreSnapshot = {
  hunts: StoredHunt[];
  clues: Clue[];
};

export interface HuntProgressSnapshot {
  huntId: number;
  currentClueIndex: number;
  startedAt: number;
  completed: boolean;
  completedAt?: number;
}

export interface HuntStorageGcResult {
  huntId: number;
  reclaimedBytes: number;
  removedKeys: string[];
}

const STORAGE_KEY = "hunty_hunts";
const CLUES_KEY = "hunty_clues";

export const MAX_CLUES_PER_HUNT = 10;
export const DEFAULT_HUNT_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SPOTLIGHT_DURATION_SECONDS = 24 * 60 * 60;
export const SPOTLIGHT_FEE_XLM = 1;
export const REWARD_REFUND_GRACE_PERIOD_SECONDS = 7 * 24 * 60 * 60;

const NOW_SECONDS = Math.floor(Date.now() / 1000);

export const SEED_HUNTS: StoredHunt[] = [
  {
    id: 1,
    title: "City Secrets",
    description: "Race across town to uncover hidden murals and landmarks.",
    cluesCount: 5,
    category: "Urban",
    status: "Active",
    rewardType: "XLM",
    rewardPool: 150,
    poolBalance: 150,
    rewardDistribution: [
      { place: 1, amount: 100 },
      { place: 2, amount: 30 },
      { place: 3, amount: 20 },
    ],
    playerCount: 32,
    createdAt: NOW_SECONDS - 2 * 86400,
    startTime: NOW_SECONDS - 86400,
    endTime: NOW_SECONDS + 7 * 86400,
    difficulty: "Easy",
    mapLatitude: 40.7128,
    mapLongitude: -74.006,
  },
  {
    id: 2,
    title: "Campus Quest",
    description: "Solve riddles scattered around campus before the timer ends.",
    cluesCount: 7,
    category: "Campus",
    status: "Active",
    rewardType: "NFT",
    rewardPool: 40,
    poolBalance: 40,
    rewardDistribution: [],
    playerCount: 21,
    createdAt: NOW_SECONDS - 4 * 86400,
    startTime: NOW_SECONDS - 2 * 86400,
    endTime: NOW_SECONDS + 3 * 86400,
    difficulty: "Hard",
    mapLatitude: 37.7749,
    mapLongitude: -122.4194,
  },
  {
    id: 3,
    title: "Office Onboarding Hunt",
    description: "A playful intro game for new teammates around the office.",
    cluesCount: 4,
    category: "Office",
    status: "Completed",
    rewardType: "Both",
    rewardPool: 250,
    poolBalance: 0,
    rewardDistribution: [],
    playerCount: 14,
    createdAt: NOW_SECONDS - 12 * 86400,
    startTime: NOW_SECONDS - 10 * 86400,
    endTime: NOW_SECONDS - 5 * 86400,
    difficulty: "Expert",
    mapLatitude: 51.5072,
    mapLongitude: -0.1276,
  },
  {
    id: 4,
    title: "Summer Treasure Hunt",
    description: "Find hidden clues in the park.",
    cluesCount: 3,
    category: "General",
    difficulty: "Easy",
    status: "Draft",
    rewardType: "XLM",
    rewardPool: 80,
    poolBalance: 80,
    rewardDistribution: [],
    playerCount: 0,
    createdAt: NOW_SECONDS - 3 * 86400,
  },
  {
    id: 5,
    title: "Museum Mystery",
    description: "Discover art and history through clues.",
    cluesCount: 0,
    category: "Museum",
    difficulty: "Medium",
    status: "Draft",
    rewardType: "NFT",
    rewardPool: 25,
    poolBalance: 25,
    rewardDistribution: [],
    playerCount: 0,
    createdAt: NOW_SECONDS - 86400,
  },
];

export function readClues(): Clue[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CLUES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Clue[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeClues(clues: Clue[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CLUES_KEY, JSON.stringify(clues));
  } catch {
    // Ignore storage failures to preserve the existing browser behavior.
  }
}

export function readHunts(): StoredHunt[] {
  if (typeof window === "undefined") return [...SEED_HUNTS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...SEED_HUNTS];
    const parsed = JSON.parse(raw) as StoredHunt[];
    return Array.isArray(parsed)
      ? migrateHuntScheduleFieldsInCollection(parsed)
      : migrateHuntScheduleFieldsInCollection([...SEED_HUNTS]);
  } catch {
    return [...SEED_HUNTS];
  }
}

export function writeHunts(hunts: StoredHunt[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hunts));
  } catch {
    // Ignore storage failures to preserve the existing browser behavior.
  }
}

export function createInviteUuid(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
  if (typeof cryptoApi?.getRandomValues !== "function") {
    throw new Error("Secure random token generation is not available in this browser.");
  }

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10).join(""),
  ].join("-");
}
