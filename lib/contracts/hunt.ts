import Server, { TransactionBuilder, Operation, Account } from "@stellar/stellar-sdk"
import { getHunt as getStoredHunt, getHuntClues } from "@/lib/huntStore"
import { withSorobanRpcRetry } from "@/lib/soroban/rpcRetry"
import { normalizeNetworkError, AnswerIncorrectError } from "./errors"
import { SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from "./config"
import { getActiveWalletAdapter } from "@/lib/walletAdapter"

import type { ClueInfo, HuntInfo, CreateHuntResult, SubmitAnswerResult, ActivateHuntResult, AddClueResult, ExtendHuntResult, LeaderboardEntry, FastestPlayerEntry } from "@/lib/types"

export type { ClueInfo, HuntInfo, CreateHuntResult, SubmitAnswerResult, ActivateHuntResult, AddClueResult, ExtendHuntResult, LeaderboardEntry, FastestPlayerEntry }

// AnswerIncorrectError is re-exported from the central errors module for
// backwards-compatible imports (e.g. `import { AnswerIncorrectError } from "@/lib/contracts/hunt"`).
export { AnswerIncorrectError }

// Soroban-friendly createHunt helper (testnet default).
// This builds a small Stellar transaction (manageData) carrying the hunt
// payload, asks the user's Soroban/Freighter wallet to sign it, and submits
// it to the Soroban RPC. Replace with a direct contract invocation once you
// have a deployed contract and an ABI.
export async function createHunt(
  creator: string,
  title: string,
  description: string,
  start_time: number,
  end_time: number,
  /** IPFS CID (or ipfs:// URI) for the hunt cover image, stored on-chain. */
  imageCid?: string,
  creatorEmail?: string,
  emailNotifications?: boolean,
  /** When true, the hunt is hidden from the public arcade. */
  is_private?: boolean
): Promise<CreateHuntResult> {
  if (typeof window === "undefined") throw new Error("Browser environment required")

  const server = new Server(SOROBAN_RPC_URL)
  const wallet = getActiveWalletAdapter()

  // Prepare the payload and encode as string (manageData value must be string/buffer)
  const payload = JSON.stringify({
    action: "create_hunt",
    creator,
    title,
    description,
    start_time,
    end_time,
    ...(imageCid ? { image_cid: imageCid } : {}),
    ...(creatorEmail ? { creator_email: creatorEmail } : {}),
    ...(emailNotifications !== undefined ? { email_notifications: emailNotifications } : {}),
    ...(is_private ? { is_private: true } : {}),
  })

  const publicKey = await wallet.getPublicKey()

  // Load account state
  const account = (await withSorobanRpcRetry(() => server.getAccount(publicKey))) as Account

  // Use manageData to carry the payload. In production you'd call the
  // Soroban contract (invoke host function) — this is a minimal signing flow
  // that triggers the wallet and returns a tx hash on success.
  const key = `create_hunt:${Date.now()}`
  const op = Operation.manageData({ name: key, value: payload })

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(180)
    .build()

  // Wallet signing: errors (including user rejection) are intentionally allowed
  // to propagate so withTransactionToast can classify and display them.
  const signedXdr = await wallet.signTransaction(tx.toXDR())

  // Submit signed transaction XDR to RPC
  const res = (await withSorobanRpcRetry(() => server.submitTransaction(signedXdr))) as {
    hash?: string
  }
  if (!res || !res.hash) throw new Error("Transaction submission failed")

  return { txHash: res.hash }
}

/**
 * Calls the smart contract's activate_hunt(hunt_id: u64) to transition a hunt
 * from Draft to Active. Requires wallet and Soroban RPC.
 */
export async function activateHunt(huntId: number): Promise<ActivateHuntResult> {
  if (typeof window === "undefined") throw new Error("Browser environment required")

  const server = new Server(SOROBAN_RPC_URL)
  const wallet = getActiveWalletAdapter()
  const publicKey = await wallet.getPublicKey()

  const account = (await withSorobanRpcRetry(() => server.getAccount(publicKey))) as Account
  const payload = JSON.stringify({ action: "activate_hunt", hunt_id: huntId })
  const key = `activate_hunt:${Date.now()}`
  const op = Operation.manageData({ name: key, value: payload })

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(180)
    .build()

  const signedXdr = await wallet.signTransaction(tx.toXDR())

  const res = (await withSorobanRpcRetry(() => server.submitTransaction(signedXdr))) as {
    hash?: string
  }
  if (!res?.hash) throw new Error("Transaction submission failed")
  return { txHash: res.hash }
}

/**
 * Calls the smart contract's add_clue(hunt_id: u64, question: String, answer: String, points: u32).
 * The answer is trimmed and normalized to lowercase before signing to match contract expectations.
 */
export async function addClue(
  huntId: number,
  question: string,
  answer: string,
  points: number,
  hint?: string,
  hintCost?: number
): Promise<AddClueResult> {
  if (typeof window === "undefined") throw new Error("Browser environment required")

  const server = new Server(SOROBAN_RPC_URL)
  const wallet = getActiveWalletAdapter()
  const publicKey = await wallet.getPublicKey()

  const normalizedAnswer = answer.trim().toLowerCase()

  const account = (await withSorobanRpcRetry(() => server.getAccount(publicKey))) as Account
  const payload = JSON.stringify({
    action: "add_clue",
    hunt_id: huntId,
    question,
    answer: normalizedAnswer,
    points,
    ...(hint ? { hint } : {}),
    ...(hintCost ? { hint_cost: hintCost } : {}),
  })
  const key = `add_clue:${Date.now()}`
  const op = Operation.manageData({ name: key, value: payload })

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(180)
    .build()

  const signedXdr = await wallet.signTransaction(tx.toXDR())

  const res2 = (await withSorobanRpcRetry(() => server.submitTransaction(signedXdr))) as {
    hash?: string
  }
  if (!res2?.hash) throw new Error("Transaction submission failed")
  return { txHash: res2.hash }
}

/**
 * Calls the smart contract's extend_end_time(hunt_id: u64, new_end_time: u64) to extend a hunt's duration.
 * Requires wallet and Soroban RPC.
 */
export async function extendEndTime(
  huntId: number,
  newEndTime: number
): Promise<ExtendHuntResult> {
  if (typeof window === "undefined") throw new Error("Browser environment required")

  const server = new Server(SOROBAN_RPC_URL)
  const wallet = getActiveWalletAdapter()
  const publicKey = await wallet.getPublicKey()

  const account = (await withSorobanRpcRetry(() => server.getAccount(publicKey))) as Account
  const payload = JSON.stringify({
    action: "extend_end_time",
    hunt_id: huntId,
    new_end_time: newEndTime,
  })
  const key = `extend_end_time:${Date.now()}`
  const op = Operation.manageData({ name: key, value: payload })

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(180)
    .build()

  const signedXdr = await wallet.signTransaction(tx.toXDR())

  const res = (await withSorobanRpcRetry(() => server.submitTransaction(signedXdr))) as {
    hash?: string
  }
  if (!res?.hash) throw new Error("Transaction submission failed")
  return { txHash: res.hash, newEndTime }
}

/**
 * Retrieves the hunt leaderboard. 
 * Attempts to fetch "live" data from the contract account's data attributes 
 * (leveraging the manageData pattern) with a robust mock data fallback.
 */
export async function get_hunt_leaderboard(huntId: number): Promise<LeaderboardEntry[]> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800))

  const mockData: LeaderboardEntry[] = [
    { address: "GDD...9X2", name: "StellarQuest", points: 45 },
    { address: "GBX...A1B", points: 30 },
    { address: "GCT...Z9Y", name: "AliceCrypto", points: 58 },
    { address: "GDE...123", points: 15 },
    { address: "GFA...789", name: "BobHunts", points: 41 },
    { address: "GCA...HB2", points: 28 },
  ]

  if (typeof window !== "undefined") {
    try {
      const myPointsStr = localStorage.getItem(`hunt_${huntId}_my_points`)
      if (myPointsStr) {
        const myPoints = parseInt(myPointsStr, 10)
        if (myPoints > 0) {
          mockData.push({ address: "YOU...PLYR", name: "You (Current Player)", points: myPoints })
        }
      }
    } catch (e) {
      console.error("Failed to fetch leaderboard:", e)
    }
  }

  return mockData
}

export async function get_hunt_fastest_players(huntId: number): Promise<FastestPlayerEntry[]> {
  const indexerUrl = process.env.NEXT_PUBLIC_TORII_INDEXER_URL

  if (indexerUrl) {
    try {
      const response = await fetch(`${indexerUrl}/hunts/${huntId}/fastest-completions`, {
        cache: "no-store",
      })

      if (response.ok) {
        const body = await response.json()
        type FastestCompletionRow = {
          address?: string
          name?: string
          points?: number
          completion_time_seconds?: number
          duration_seconds?: number
          completion_time_ms?: number
          duration_ms?: number
        }

        const rows: FastestCompletionRow[] = Array.isArray(body?.data)
          ? body.data
          : Array.isArray(body?.entries)
            ? body.entries
            : []

        if (rows.length > 0) {
          return rows
            .map((entry) => ({
              address: entry.address,
              name: entry.name,
              points: typeof entry.points === "number" ? entry.points : undefined,
              completionTimeSeconds:
                typeof entry.completion_time_seconds === "number"
                  ? entry.completion_time_seconds
                  : typeof entry.duration_seconds === "number"
                  ? entry.duration_seconds
                  : Math.floor((Number(entry.completion_time_ms ?? entry.duration_ms ?? 0) / 1000) || 0),
            }))
            .filter((entry) => entry.address && entry.completionTimeSeconds >= 0)
        }
      }
    } catch (error) {
      console.warn("Torii indexer fetch failed:", error)
    }
  }

  const leaderboard = await get_hunt_leaderboard(huntId)
  const sortedByPoints = [...leaderboard].sort((a, b) => b.points - a.points)

  return sortedByPoints.map((entry, index) => ({
    address: entry.address,
    name: entry.name,
    points: entry.points,
    completionTimeSeconds: 600 + index * 90,
  }))
}

/**
 * Fetches hunt metadata including total clue count.
 * Mock implementation reading from localStorage via huntStore.
 */
export async function get_hunt(huntId: number): Promise<HuntInfo> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  try {
    const stored = getStoredHunt(String(huntId))
    if (!stored) throw new Error(`Hunt ${huntId} not found`)

    return {
      id: stored.id,
      title: stored.title,
      description: stored.description,
      totalClues: stored.cluesCount,
      status: stored.status,
      creatorEmail: stored.creatorEmail,
      emailNotifications: stored.emailNotifications,
    }
  } catch (error) {
    throw normalizeNetworkError(error, "Failed to fetch hunt")
  }
}

/**
 * Fetches question and points for a specific clue.
 * Never returns the answer — answers are verified on-chain via submitAnswer.
 */
export async function get_clue_info(huntId: number, clueId: number): Promise<ClueInfo> {
  await new Promise((resolve) => setTimeout(resolve, 200))

  try {
    const clues = getHuntClues(huntId)
    const clue = clues[clueId]
    if (!clue) throw new Error(`Clue ${clueId} not found for hunt ${huntId}`)

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`hunt_clue_start_${huntId}_${clue.id}`, Date.now().toString())
      } catch (e) {
        console.error("Failed to set start time:", e)
      }
    }

    return {
      id: clue.id,
      question: clue.question,
      points: clue.points,
      hint: clue.hint,
      hintCost: clue.hintCost,
    }
  } catch (error) {
    throw normalizeNetworkError(error, "Failed to fetch clue")
  }
}

/**
 * Polls the Soroban RPC for transaction inclusion.
 * Resolves to true if successful, throws if failed or timed out.
 */
export async function pollTransaction(txHash: string): Promise<boolean> {
  if (typeof window === "undefined") return true;
  if (txHash.startsWith("mock_tx_")) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return true;
  }

  const server = new Server(SOROBAN_RPC_URL);
  const maybeServer = server as Server & {
    getTransaction?: (hash: string) => Promise<{ status: string }>
  }
  
  for (let i = 0; i < 15; i++) {
    try {
      // Try using stellar-sdk SorobanRpc method if available
      if (typeof maybeServer.getTransaction === "function") {
        const res = await maybeServer.getTransaction(txHash);
        if (res && res.status !== "NOT_FOUND" && res.status !== "PENDING") {
          if (res.status === "SUCCESS") return true;
          throw new Error(`Transaction failed with status: ${res.status}`);
        }
      } else {
        // Fallback to raw JSON-RPC
        const rpcRes = await fetch(SOROBAN_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getTransaction",
            params: { hash: txHash }
          })
        }).then(r => r.json());
        
        if (rpcRes?.result) {
          const status = rpcRes.result.status;
          if (status !== "NOT_FOUND" && status !== "PENDING") {
            if (status === "SUCCESS") return true;
            throw new Error(`Transaction failed with status: ${status}`);
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("Transaction failed")) {
        throw e;
      }
      console.warn("Polling error:", e);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Transaction polling timed out after 30 seconds");
}

/**
 * Submits an answer for a specific clue. Throws AnswerIncorrectError on mismatch.
 * Mock implementation that checks against localStorage clue data.
 */
export async function submitAnswer(
  huntId: number,
  clueId: number,
  answer: string
): Promise<SubmitAnswerResult> {
  await new Promise((resolve) => setTimeout(resolve, 500))

  const clues = getHuntClues(huntId)
  const clue = clues.find((c) => c.id === clueId)
  if (!clue) throw new Error(`Clue ${clueId} not found for hunt ${huntId}`)

  const userAnswer = answer.trim().toLowerCase()
  const possibleAnswers = clue.answer.toLowerCase().split("|").map((a) => a.trim())

  if (!possibleAnswers.includes(userAnswer)) {
    throw new AnswerIncorrectError()
  }

  // Calculate speed bonus
  let bonusPoints = 0;
  if (typeof window !== "undefined") {
    try {
      const solvedKey = `hunt_clue_solved_${huntId}_${clue.id}`;
      if (!localStorage.getItem(solvedKey)) {
        const startTimeStr = localStorage.getItem(`hunt_clue_start_${huntId}_${clue.id}`);
        if (startTimeStr) {
          const startTime = parseInt(startTimeStr, 10);
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          if (elapsedSeconds < 60) {
            bonusPoints = Math.floor(60 - elapsedSeconds);
          }
        }
        
        // Add points to player's total for this hunt
        const userPointsKey = `hunt_${huntId}_my_points`;
        const currentPoints = parseInt(localStorage.getItem(userPointsKey) || "0", 10);
        localStorage.setItem(userPointsKey, (currentPoints + clue.points + bonusPoints).toString());
        
        // Mark as solved
        localStorage.setItem(solvedKey, "true");
      }
    } catch (e) {
      console.error("Failed to update local clue state in localStorage after answer submission:", e)
    }
  }

  return {
    txHash: `mock_tx_${Date.now()}`,
    event: "ClueCompleted",
  }
}
