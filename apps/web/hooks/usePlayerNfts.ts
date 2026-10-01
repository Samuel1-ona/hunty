/**
 * usePlayerNfts
 *
 * React hook that fetches on-chain NFT rewards for the connected player.
 * Calls `get_player_nfts` on the NFT_REWARD Soroban contract, resolves each
 * token's IPFS metadata URI with `get_nft_uri`, then fetches the SEP-0039
 * metadata JSON from the IPFS gateway.
 *
 * Returns `NftRewardDetail[]` ready for `<NftGallery nfts={…} />`.
 */

import { useCallback, useEffect, useState } from "react";

import type { NftRewardDetail } from "@/components/NftDetailModal";
import { fetchPlayerNftsOnChain } from "@/lib/nft/fetchPlayerNftsOnChain";

interface UsePlayerNftsState {
  nfts: NftRewardDetail[];
  loading: boolean;
  error: string | null;
  /** Re-trigger a fresh fetch (e.g. after a mint). */
  refresh: () => void;
}

/**
 * Fetches the NFT gallery for `ownerAddress`.
 *
 * @param ownerAddress Stellar public key of the wallet owner. An empty string
 *                     skips the fetch and returns an empty list.
 */
export function usePlayerNfts(ownerAddress: string): UsePlayerNftsState {
  const [nfts, setNfts] = useState<NftRewardDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!ownerAddress) {
      setNfts([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchPlayerNftsOnChain(ownerAddress);
        if (!cancelled) setNfts(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load NFT rewards.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [ownerAddress, tick]);

  return { nfts, loading, error, refresh };
}
