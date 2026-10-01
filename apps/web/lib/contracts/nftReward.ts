/**
 * On-chain reader for the NftRewardContract.
 *
 * Wraps the two read-only methods needed by the player profile:
 *   - get_player_nfts(owner: Address) → Vec<u64>
 *   - get_nft_uri(nft_id: u64)        → Option<String>
 *
 * Uses the Soroban RPC `simulateTransaction` path so no wallet is needed
 * for read-only calls.
 */

import {
  Account,
  Address,
  Contract,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

import { logger } from "@/lib/logger";
import { createSorobanServer, getSorobanNetworkPassphrase } from "@/lib/soroban/client";
import { withSorobanRpcRetry } from "@/lib/soroban/rpcRetry";

import { getContracts } from "./config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Dummy source keypair for simulation-only transactions (no signing needed). */
const DUMMY_SOURCE = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

/**
 * Simulates a read-only contract call and returns the raw result XDR.
 * Throws when the contract address is not configured or the RPC fails.
 */
async function simulateReadCall(method: string, args: xdr.ScVal[]): Promise<xdr.ScVal> {
  const contractId = getContracts().NFT_REWARD;
  if (!contractId) {
    throw new Error(
      "NFT_REWARD contract address is not configured. " +
        "Set NEXT_PUBLIC_NFT_REWARD_ADDRESS in your environment.",
    );
  }

  const server = createSorobanServer();
  const networkPassphrase = getSorobanNetworkPassphrase();

  // Build a dummy source account.
  // Simulation does not require a real funded account — any valid keypair works.
  let account: Account;
  try {
    account = await withSorobanRpcRetry(() => (server as rpc.Server).getAccount(DUMMY_SOURCE), {
      maxAttempts: 2,
      timeoutMs: 8000,
    });
  } catch {
    // If the dummy account doesn't exist on the network, construct a minimal one.
    // sequence "0" is fine for read-only simulation.
    account = new Account(DUMMY_SOURCE, "0");
  }

  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simResult = await withSorobanRpcRetry(
    () => (server as rpc.Server).simulateTransaction(tx),
    { maxAttempts: 3, timeoutMs: 15000 },
  );

  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Contract simulation failed: ${simResult.error}`);
  }

  if (!rpc.Api.isSimulationSuccess(simResult) || !simResult.result) {
    throw new Error("Contract simulation returned no result");
  }

  return simResult.result.retval;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calls `get_player_nfts(owner)` on the NFT reward contract.
 * Returns an array of NFT IDs owned by the given Stellar address.
 */
export async function getPlayerNftIds(ownerAddress: string): Promise<bigint[]> {
  try {
    const ownerScVal = nativeToScVal(Address.fromString(ownerAddress), { type: "address" });
    const retval = await simulateReadCall("get_player_nfts", [ownerScVal]);
    const native = scValToNative(retval) as bigint[];
    // scValToNative returns bigint for u64
    return Array.isArray(native) ? native : [];
  } catch (err) {
    logger.error("getPlayerNftIds failed:", err);
    return [];
  }
}

/**
 * Calls `get_nft_uri(nft_id)` on the NFT reward contract.
 * Returns the IPFS URI string, or null if the NFT does not exist.
 */
export async function getNftUri(nftId: bigint): Promise<string | null> {
  try {
    const idScVal = nativeToScVal(nftId, { type: "u64" });
    const retval = await simulateReadCall("get_nft_uri", [idScVal]);
    const native = scValToNative(retval) as string | null | undefined;
    return native ?? null;
  } catch (err) {
    logger.error(`getNftUri(${nftId}) failed:`, err);
    return null;
  }
}

/**
 * Fetches the IPFS URI for each NFT ID in parallel (with concurrency cap).
 * Returns a map of nft_id → uri (nulls are omitted).
 */
export async function getNftUris(
  nftIds: bigint[],
  concurrency = 5,
): Promise<Map<bigint, string>> {
  const result = new Map<bigint, string>();
  // Process in batches to avoid overwhelming the RPC
  for (let i = 0; i < nftIds.length; i += concurrency) {
    const batch = nftIds.slice(i, i + concurrency);
    const uris = await Promise.all(batch.map((id) => getNftUri(id)));
    batch.forEach((id, idx) => {
      const uri = uris[idx];
      if (uri) result.set(id, uri);
    });
  }
  return result;
}
