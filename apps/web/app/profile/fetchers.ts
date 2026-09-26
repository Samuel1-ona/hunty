import type { NftRewardDetail } from "@/components/NftDetailModal";
import type { PlayerHuntProgress, RegisteredHunt } from "./types";

type NftReward = NftRewardDetail;

/**
 * Fetch all hunts the player has registered for from the PlayerRegistration
 * contract (or indexer). Returns registrations sorted by start time ascending.
 *
 * Replace this stub with a real `get_player_registrations(address)` call once
 * the indexer endpoint is available.
 */
export async function fetchPlayerRegistrations(address: string): Promise<RegisteredHunt[]> {
  if (!address) return [];

  return [
    {
      huntId: 10,
      title: "Downtown Mural Hunt",
      startTime: Math.floor(Date.now() / 1000) + 3 * 86400,
      status: "Registered",
    },
    {
      huntId: 11,
      title: "Campus Cryptography Quest",
      startTime: Math.floor(Date.now() / 1000) - 3600,
      status: "In Progress",
    },
    {
      huntId: 12,
      title: "Stellar Dev Hunt",
      startTime: Math.floor(Date.now() / 1000) - 7 * 86400,
      status: "Completed",
    },
  ];
}

/**
 * Temporary data fetcher; replace with real Soroban/indexer integration calling
 * `get_player_progress` for the connected player's address.
 */
export async function fetchPlayerHunts(address: string): Promise<PlayerHuntProgress[]> {
  if (!address) return [];

  return [
    {
      id: 1,
      title: "City Secrets",
      description: "Race across town to uncover hidden murals and landmarks.",
      totalClues: 5,
      status: "Completed",
      pointsEarned: 12,
      startedAt: "2026-02-10T14:32:00Z",
      completedAt: "2026-02-10T15:12:00Z",
    },
    {
      id: 2,
      title: "Campus Quest",
      description: "Solve riddles scattered around campus before the timer ends.",
      totalClues: 7,
      status: "In-Progress",
      pointsEarned: 4,
      startedAt: "2026-02-18T17:05:00Z",
    },
    {
      id: 3,
      title: "Office Onboarding Hunt",
      description: "A playful intro game for new teammates around the office.",
      totalClues: 4,
      status: "Completed",
      pointsEarned: 9,
      startedAt: "2026-02-20T11:00:00Z",
      completedAt: "2026-02-20T11:25:00Z",
    },
  ];
}

export async function fetchPlayerRewards(address: string): Promise<NftReward[]> {
  if (!address) return [];

  return [
    {
      id: 1,
      name: "Golden Compass",
      description:
        "A legendary artifact awarded to those who uncover all secret murals in the City Secrets hunt.",
      imageUri: "/static-images/nft1.png",
      earnedAt: "2026-02-10T15:16:00Z",
      claimed: true,
      huntName: "City Secrets",
      attributes: [
        { trait_type: "Rarity", value: "Legendary" },
        { trait_type: "Type", value: "Utility" },
      ],
    },
    {
      id: 2,
      name: "Explorer Trophy",
      description:
        "Granted for successfully completing the Office Onboarding challenge within the time limit.",
      imageUri: "/static-images/nft2.png",
      earnedAt: "2026-02-20T11:26:00Z",
      claimed: false,
      huntName: "Office Onboarding",
      attributes: [
        { trait_type: "Rarity", value: "Rare" },
        { trait_type: "Level", value: 5 },
      ],
    },
    {
      id: 3,
      name: "Soroban Sage",
      description:
        "Awarded to players who demonstrate exceptional knowledge of smart contract riddles.",
      imageUri: "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
      earnedAt: "2026-03-05T09:45:00Z",
      claimed: true,
      huntName: "Stellar Developer Hunt",
      attributes: [
        { trait_type: "Rarity", value: "Epic" },
        { trait_type: "Skill", value: "Contracting" },
      ],
    },
  ];
      }
