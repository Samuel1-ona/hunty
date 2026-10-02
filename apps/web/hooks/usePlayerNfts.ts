/**
 * usePlayerNfts — fetches a player's NFTs from the on-chain NftRewardContract
 * and resolves their IPFS metadata.
 *
 * Usage:
 *   const { nfts, loading, error } = usePlayerNfts(walletAddress);
 */
import { useEffect, useState } from "react";

import type { NftRewardDetail } from "@/components/NftDetailModal";
import { fetchPlayerRewards } from "@/app/profile/fetchers";

export type { NftRewardDetail as NftItem };

export interface UsePlayerNftsResult {
  nfts: NftRewardDetail[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches the player's on-chain NFT rewards and resolves IPFS metadata for each.
 *
 * @param address Stellar public key (G...) of the player. Pass an empty string
 *   or undefined to skip fetching.
 */
export function usePlayerNfts(address?: string): UsePlayerNftsResult {
  const [nfts, setNfts] = useState<NftRewardDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setNfts([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchPlayerRewards(address);
        if (!cancelled) setNfts(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load NFTs");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [address]);

  return { nfts, loading, error };
}
