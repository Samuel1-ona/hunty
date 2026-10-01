import type { NftRewardDetail } from "@/components/NftDetailModal";
import { fetchPlayerNftsOnChain } from "@/lib/nft/fetchPlayerNftsOnChain";
import type { PlayerHuntProgress, RegisteredHunt } from "./types";

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

/**
 * Fetches NFT rewards for the given player address from the on-chain
 * NFT_REWARD Soroban contract.
 *
 * Calls `get_player_nfts(owner)` → `Vec<u64>`, resolves each URI with
 * `get_nft_uri(id)`, and fetches the SEP-0039 IPFS metadata JSON from the
 * gateway.  Returns an empty array when the wallet has no NFTs or the
 * contract address is not configured.
 */
export async function fetchPlayerRewards(
  address: string,
): Promise<NftRewardDetail[]> {
  return fetchPlayerNftsOnChain(address);
}
