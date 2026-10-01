/**
 * On-chain NFT fetching for the player profile.
 *
 * Reads NFT IDs owned by a player from the NFT_REWARD Soroban contract via
 * `get_player_nfts(owner)` → `Vec<u64>`, then resolves each ID to an IPFS
 * metadata URI with `get_nft_uri(id)` → `Option<String>`, and finally
 * fetches the SEP-0039 JSON blob from IPFS.
 *
 * All I/O failures are caught per-NFT so one broken token never prevents the
 * rest of the gallery from loading.
 *
 * Contract reference: contracts/nft-reward/src/lib.rs
 *   pub fn get_player_nfts(env: Env, owner: Address) -> Vec<u64>
 *   pub fn get_nft_uri(env: Env, nft_id: u64) -> Option<String>
 */

import {
  Address,
  nativeToScVal,
  Operation,
  rpc,
  scValToNative,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

import type { NftRewardDetail } from "@/components/NftDetailModal";
import { CONTRACTS, NETWORK_PASSPHRASE } from "@/lib/contracts/config";
import { resolveImageSrc } from "@/lib/ipfs";
import { logger } from "@/lib/logger";
import type { NftMetadata } from "@/lib/nft/types";
import { createSorobanServer } from "@/lib/soroban/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SorobanServer = rpc.Server;

// ---------------------------------------------------------------------------
// Low-level contract read helper
// ---------------------------------------------------------------------------

/**
 * Simulates a read-only Soroban contract call and returns the decoded return
 * value as a native JS type.
 *
 * We build a real `Transaction` and call `server.simulateTransaction` because
 * that is the canonical stellar-sdk v14 path for contract reads — no wallet
 * signing is required for simulation.
 */
async function simulateContractRead(
  server: SorobanServer,
  contractId: string,
  method: string,
  args: ReturnType<typeof nativeToScVal>[],
): Promise<unknown> {
  // Use a well-known funded testnet account as the source. Simulation only
  // needs a valid sequence number, which is loaded from the network; the
  // account does not need funds for reads.
  const SIMULATION_SOURCE =
    "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

  const account = await server.getAccount(SIMULATION_SOURCE);

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: method,
        args,
      }),
    )
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(
      `Simulation error [${method}]: ${simResult.error}`,
    );
  }

  const successResult = simResult as rpc.Api.SimulateTransactionSuccessResponse;
  const retval = successResult.result?.retval;
  if (!retval) return null;

  return scValToNative(retval);
}

// ---------------------------------------------------------------------------
// Contract-level helpers
// ---------------------------------------------------------------------------

/**
 * Returns the on-chain NFT IDs owned by `ownerAddress`.
 * Gracefully returns `[]` when the contract is not configured or the RPC
 * call fails (e.g. the owner has no NFTs yet).
 */
export async function getPlayerNftIds(
  ownerAddress: string,
): Promise<bigint[]> {
  const contractId = CONTRACTS.NFT_REWARD;
  if (!contractId) {
    logger.warn(
      "getPlayerNftIds: NEXT_PUBLIC_NFT_REWARD_ADDRESS not set — returning empty list",
    );
    return [];
  }

  try {
    const server = createSorobanServer();
    const ownerScVal = nativeToScVal(Address.fromString(ownerAddress), {
      type: "address",
    });

    const result = await simulateContractRead(
      server,
      contractId,
      "get_player_nfts",
      [ownerScVal],
    );

    // The contract returns Vec<u64>. scValToNative maps this to an array of
    // BigInt values on the JavaScript side.
    if (!Array.isArray(result)) return [];
    return result as bigint[];
  } catch (err) {
    logger.error("getPlayerNftIds: RPC call failed", err);
    return [];
  }
}

/**
 * Returns the IPFS metadata URI for a single NFT, or `null` when the NFT
 * has no URI or the call fails.
 */
export async function getNftUri(
  nftId: bigint,
  server?: SorobanServer,
): Promise<string | null> {
  const contractId = CONTRACTS.NFT_REWARD;
  if (!contractId) return null;

  try {
    const srv = server ?? createSorobanServer();
    const idScVal = nativeToScVal(nftId, { type: "u64" });

    const result = await simulateContractRead(
      srv,
      contractId,
      "get_nft_uri",
      [idScVal],
    );

    if (typeof result !== "string") return null;
    return result;
  } catch (err) {
    logger.warn(`getNftUri: failed for NFT ${nftId}`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// IPFS metadata fetcher
// ---------------------------------------------------------------------------

/**
 * Fetches a SEP-0039 metadata JSON blob from an `ipfs://` URI via a public
 * IPFS gateway. Returns `null` on network or parse failures.
 */
export async function fetchNftMetadata(
  uri: string,
): Promise<NftMetadata | null> {
  try {
    const url = resolveImageSrc(uri);
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) {
      logger.warn(
        `fetchNftMetadata: HTTP ${res.status} for ${uri}`,
      );
      return null;
    }
    const json = (await res.json()) as NftMetadata;
    return json;
  } catch (err) {
    logger.warn("fetchNftMetadata: failed to fetch/parse metadata", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public pipeline
// ---------------------------------------------------------------------------

/**
 * Full pipeline: given a Stellar wallet address, returns `NftRewardDetail[]`
 * ready for `<NftGallery nfts={…} />`.
 *
 * Steps:
 *  1. `get_player_nfts(owner)` → `bigint[]` of NFT IDs
 *  2. For each ID: `get_nft_uri(id)` → `string | null`
 *  3. For each URI: fetch IPFS metadata JSON → `NftMetadata | null`
 *  4. Map to `NftRewardDetail`
 *
 * Each individual fetch is independent; failures are logged and skipped.
 */
export async function fetchPlayerNftsOnChain(
  ownerAddress: string,
): Promise<NftRewardDetail[]> {
  if (!ownerAddress) return [];

  const nftIds = await getPlayerNftIds(ownerAddress);
  if (nftIds.length === 0) return [];

  // Reuse one server instance for all `get_nft_uri` calls.
  const server = createSorobanServer();

  const settled = await Promise.allSettled(
    nftIds.map(async (nftId): Promise<NftRewardDetail | null> => {
      const uri = await getNftUri(nftId, server);
      if (!uri) {
        logger.warn(`fetchPlayerNftsOnChain: no URI for NFT #${nftId}`);
        return null;
      }

      const metadata = await fetchNftMetadata(uri);
      const numericId = Number(nftId);

      if (!metadata) {
        // Render a minimal card even when IPFS metadata is unavailable.
        return {
          id: numericId,
          name: `NFT #${numericId}`,
          description: undefined,
          imageUri: uri,
          earnedAt: new Date().toISOString(),
          claimed: true,
          attributes: [],
          metadataUri: uri,
        };
      }

      const earnedAt = metadata.earned_at ?? new Date().toISOString();

      // Lift the hunt name from the attributes array when present.
      const huntAttr = metadata.attributes?.find(
        (a) => a.trait_type.toLowerCase() === "hunt",
      );
      const huntName =
        typeof huntAttr?.value === "string" ? huntAttr.value : undefined;

      return {
        id: numericId,
        name: metadata.name,
        description: metadata.description,
        // `metadata.image` is the canonical artwork URI (ipfs:// or HTTP).
        imageUri: metadata.image,
        earnedAt,
        // NFTs that exist on-chain are by definition already claimed/minted.
        claimed: true,
        attributes: metadata.attributes ?? [],
        huntName,
        metadataUri: uri,
      };
    }),
  );

  const details: NftRewardDetail[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled" && result.value !== null) {
      details.push(result.value);
    } else if (result.status === "rejected") {
      logger.warn(
        "fetchPlayerNftsOnChain: single NFT fetch rejected",
        result.reason,
      );
    }
  }

  return details;
}
