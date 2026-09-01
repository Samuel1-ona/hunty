// lib/nftUtils.ts

/**
 * Utility functions and data fetching for NFT gallery.
 * Reuses the same stub data as the profile page for now.
 */

export interface NftReward {
  id: number;
  name: string;
  description: string;
  imageUri: string;
  earnedAt: string; // ISO date string
  claimed: boolean;
  huntName: string;
  attributes: { trait_type: string; value: string }[];
}

/** Fetch player NFT rewards.
 * In production this would call an API endpoint or smart contract.
 */
export async function fetchPlayerNfts(address: string): Promise<NftReward[]> {
  if (!address) return [];
  // Stub data – same as profile page
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
        { trait_type: "Level", value: "5" },
      ],
    },
    {
      id: 3,
      name: "Soroban Sage",
      description:
        "Awarded to players who demonstrate exceptional knowledge of smart contract riddles.",
      imageUri:
        "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
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

/** Sort NFTs by newest first (earnedAt descending). */
export function sortByNewest(nfts: NftReward[]): NftReward[] {
  return [...nfts].sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime());
}

/** Sort NFTs by rarity (Legendary > Epic > Rare > Uncommon > Common). */
export function sortByRarity(nfts: NftReward[]): NftReward[] {
  const rarityOrder: Record<string, number> = {
    Legendary: 5,
    Epic: 4,
    Rare: 3,
    Uncommon: 2,
    Common: 1,
  };
  return [...nfts].sort((a, b) => {
    const aRarity = a.attributes.find((a) => a.trait_type === "Rarity")?.value ?? "Common";
    const bRarity = b.attributes.find((a) => a.trait_type === "Rarity")?.value ?? "Common";
    return (rarityOrder[bRarity] ?? 0) - (rarityOrder[aRarity] ?? 0);
  });
}

/** Filter NFTs by hunt name (or all). */
export function filterByHunt(nfts: NftReward[], hunt: string | null): NftReward[] {
  if (!hunt || hunt === "All") return nfts;
  return nfts.filter((n) => n.huntName === hunt);
}

/** Filter NFTs by date range (ISO strings). */
export function filterByDate(
  nfts: NftReward[],
  start?: string,
  end?: string,
): NftReward[] {
  return nfts.filter((n) => {
    const earned = new Date(n.earnedAt).getTime();
    const afterStart = start ? earned >= new Date(start).getTime() : true;
    const beforeEnd = end ? earned <= new Date(end).getTime() : true;
    return afterStart && beforeEnd;
  });
}
