import type { NftRewardDetail } from "@/components/NftDetailModal";
import { resolveImageSrc } from "@/lib/ipfs";
import { logger } from "@/lib/logger";
import { getPlayerNftIds, getNftUris } from "@/lib/contracts/nftReward";
import type { NftMetadata } from "@/lib/nft/types";
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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Fetches and parses IPFS metadata JSON from an `ipfs://` or HTTP URI.
 * Returns null when the fetch fails or the response is not valid JSON.
 */
async function fetchIpfsMetadata(uri: string): Promise<NftMetadata | null> {
  try {
    const httpUrl = resolveImageSrc(uri);
    const res = await fetch(httpUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const json = await res.json() as NftMetadata;
    return json;
  } catch (err) {
    logger.warn(`fetchIpfsMetadata failed for ${uri}:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public fetchers
// ---------------------------------------------------------------------------

export async function fetchPlayerRewards(address: string): Promise<NftReward[]> {
  if (!address) return [];

  try {
    // 1. Fetch the list of NFT IDs owned by this address from the on-chain contract.
    const nftIds = await getPlayerNftIds(address);
    if (nftIds.length === 0) return [];

    // 2. Fetch the IPFS metadata URI for each NFT ID.
    const uriMap = await getNftUris(nftIds);

    // 3. For each URI, fetch and parse the IPFS metadata JSON in parallel.
    const results = await Promise.all(
      nftIds.map(async (id): Promise<NftReward | null> => {
        const metadataUri = uriMap.get(id);
        if (!metadataUri) return null;

        const metadata = await fetchIpfsMetadata(metadataUri);

        // Build a NftRewardDetail from the on-chain + IPFS data.
        const nftIdNumber = Number(id); // safe: NFT IDs are practical small integers
        const imageUri = metadata?.image ?? metadataUri;

        // Find the hunt name from attributes if present
        const huntNameAttr = metadata?.attributes?.find(
          (a) => a.trait_type.toLowerCase() === "hunt" || a.trait_type.toLowerCase() === "hunt_name",
        );
        const huntName = huntNameAttr
          ? String(huntNameAttr.value)
          : metadata?.external_url
          ? undefined
          : undefined;

        return {
          id: nftIdNumber,
          name: metadata?.name ?? `NFT #${nftIdNumber}`,
          description: metadata?.description,
          imageUri,
          metadataUri,
          earnedAt: metadata?.earned_at ?? new Date(0).toISOString(),
          // On-chain NFTs are always minted (claimed). The "unclaimed" state
          // only applies to off-chain pending rewards.
          claimed: true,
          attributes: metadata?.attributes ?? [],
          huntName,
        } satisfies NftReward;
      }),
    );

    return results.filter((r): r is NftReward => r !== null);
  } catch (err) {
    logger.error("fetchPlayerRewards failed:", err);
    return [];
  }
}
