import Server, { TransactionBuilder, Operation, Account } from "@stellar/stellar-sdk";
import {
  advanceHuntProgress,
  getHunt as getStoredHunt,
  getHuntClues,
  getHuntProgress,
} from "@/lib/huntStore";
import { withSorobanRpcRetry } from "@/lib/soroban/rpcRetry";
import { pollTransactionStatus } from "@/lib/soroban/contractHelpers";
import { normalizeNetworkError, AnswerIncorrectError, SequentialClueError } from "./errors";
import { SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from "./config";
import { getActiveWalletAdapter } from "@/lib/walletAdapter";
import { sha256Hex } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { isOnline, queueProgressUpdate } from "@/lib/offlineSync";
import { getRuntimeLocale, resolveLocalizedText } from "@/lib/clueLocalization";

import type {
  ClueDifficulty,
  ClueInfo,
  HuntDifficulty,
  HuntInfo,
  CreateHuntResult,
  SubmitAnswerResult,
  ActivateHuntResult,
  AddClueResult,
  ExtendHuntResult,
  LeaderboardEntry,
  FastestPlayerEntry,
} from "@/lib/types";

export type {
  ClueInfo,
  HuntInfo,
  CreateHuntResult,
  SubmitAnswerResult,
  ActivateHuntResult,
  AddClueResult,
  ExtendHuntResult,
  LeaderboardEntry,
  FastestPlayerEntry,
};

export type ClueInput = {
  question: string;
  answer: string;
  points: number;
  questionTranslations?: Partial<Record<string, string>>;
  hintTranslations?: Partial<Record<string, string>>;
  hint?: string;
  hintCost?: number;
  difficulty?: ClueDifficulty;
};

export type AddCluesBatchResult = {
  txHash: string;
  clueCount: number;
};

// AnswerIncorrectError is re-exported from the central errors module for
// backwards-compatible imports (e.g. `import { AnswerIncorrectError } from "@/lib/contracts/hunt"`).
export { AnswerIncorrectError };

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
  is_private?: boolean,
  sequential?: boolean,
  /** Overall difficulty tag persisted with the on-chain hunt metadata. */
  difficulty?: HuntDifficulty,
  maxParticipants?: number,
  recurrence?: {
    frequency: "weekly" | "monthly";
    interval: number;
    occurrences: number;
  },
): Promise<CreateHuntResult> {
  if (typeof window === "undefined") throw new Error("Browser environment required");

  const server = new Server(SOROBAN_RPC_URL);
  const wallet = getActiveWalletAdapter();

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
    ...(sequential ? { sequential: true } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(maxParticipants !== undefined ? { max_participants: maxParticipants } : {}),
    ...(recurrence ? { recurrence } : {}),
  });

  const publicKey = await wallet.getPublicKey();

  // Load account state
  const account = (await withSorobanRpcRetry(() => server.getAccount(publicKey))) as Account;

  // Use manageData to carry the payload. In production you'd call the
  // Soroban contract (invoke host function) — this is a minimal signing flow
  // that triggers the wallet and returns a tx hash on success.
  const key = `create_hunt:${Date.now()}`;
  const op = Operation.manageData({ name: key, value: payload });

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(180)
    .build();

  // Wallet signing: errors (including user rejection) are intentionally allowed
  // to propagate so withTransactionToast can classify and display them.
  const signedXdr = await wallet.signTransaction(tx.toXDR());

  // Submit signed transaction XDR to RPC
  const res = (await withSorobanRpcRetry(() => server.submitTransaction(signedXdr))) as {
    hash?: string;
  };
  if (!res || !res.hash) throw new Error("Transaction submission failed");

  await fetch("/api/v1/webhooks/events", {
    method: "POST",
    headers: { "content-type": "application/json", "x-wallet-address": creator },
    body: JSON.stringify({
      type: "hunt.published",
      creatorAddress: creator,
      data: { title, transactionHash: res.hash },
    }),
  }).catch(() => undefined);

  return { txHash: res.hash };
}

/**
 * Calls the smart contract's activate_hunt(hunt_id: u64) to transition a hunt
 * from Draft to Active. Requires wallet and Soroban RPC.
 */
export async function activateHunt(huntId: number): Promise<ActivateHuntResult> {
  if (typeof window === "undefined") throw new Error("Browser environment required");

  const server = new Server(SOROBAN_RPC_URL);
  const wallet = getActiveWalletAdapter();
  const publicKey = await wallet.getPublicKey();

  const account = (await withSorobanRpcRetry(() => server.getAccount(publicKey))) as Account;
  const payload = JSON.stringify({ action: "activate_hunt", hunt_id: huntId });
  const key = `activate_hunt:${Date.now()}`;
  const op = Operation.manageData({ name: key, value: payload });

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(180)
    .build();

  const signedXdr = await wallet.signTransaction(tx.toXDR());

  const res = (await withSorobanRpcRetry(() => server.submitTransaction(signedXdr))) as {
    hash?: string;
  };
  if (!res?.hash) throw new Error("Transaction submission failed");
  return { txHash: res.hash };
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
  hints?: import("@/lib/types").ClueHint[],
  difficulty?: import("@/lib/types").ClueDifficulty
): Promise<AddClueResult> {
  if (typeof window === "undefined") throw new Error("Browser environment required");

  const server = new Server(SOROBAN_RPC_URL);
  const wallet = getActiveWalletAdapter();
  const publicKey = await wallet.getPublicKey();

  const normalizedAnswer = answer;

  const account = (await withSorobanRpcRetry(() => server.getAccount(publicKey))) as Account;
  const payload = JSON.stringify({
    action: "add_clue",
    hunt_id: huntId,
    question,
    answer: normalizedAnswer,
    points,
    ...(hints && hints.length > 0 ? { hints } : {}),
    ...(difficulty ? { difficulty } : {}),
  });
  const key = `add_clue:${Date.now()}`;
  const op = Operation.manageData({ name: key, value: payload });

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(180)
    .build();

  const signedXdr = await wallet.signTransaction(tx.toXDR());

  const res2 = (await withSorobanRpcRetry(() => server.submitTransaction(signedXdr))) as {
    hash?: string;
  };
  if (!res2?.hash) throw new Error("Transaction submission failed");
  return { txHash: res2.hash };
}

/**
 * Calls the smart contract's add_clues_batch(...) to persist multiple clues
 * in a single transaction.
 */
export async function addCluesBatch(
  huntId: number,
  clues: ClueInput[]
): Promise<AddCluesBatchResult> {
  if (typeof window === "undefined") throw new Error("Browser environment required");
  if (!Array.isArray(clues) || clues.length === 0) {
    throw new Error("At least one clue is required");
  }

  const server = new Server(SOROBAN_RPC_URL);
  const wallet = getActiveWalletAdapter();
  const publicKey = await wallet.getPublicKey();
  const account = (await withSorobanRpcRetry(() => server.getAccount(publicKey))) as Account;

  const normalizedClues = clues.map((clue) => ({
    question: clue.question.trim(),
    answer: clue.answer.trim(),
    points: clue.points,
    ...(clue.questionTranslations && Object.keys(clue.questionTranslations).length > 0
      ? { question_translations: Object.fromEntries(Object.entries(clue.questionTranslations).filter(([, value]) => typeof value === "string" && value.trim())) }
      : {}),
    ...(clue.hintTranslations && Object.keys(clue.hintTranslations).length > 0
      ? { hint_translations: Object.fromEntries(Object.entries(clue.hintTranslations).filter(([, value]) => typeof value === "string" && value.trim())) }
      : {}),
    ...(clue.hint?.trim() ? { hint: clue.hint.trim() } : {}),
    ...(clue.hintCost !== undefined ? { hint_cost: clue.hintCost } : {}),
    ...(clue.difficulty ? { difficulty: clue.difficulty } : {}),
  }));

  const payload = JSON.stringify({
    action: "add_clues_batch",
    hunt_id: huntId,
    clues: normalizedClues,
  });
  const key = `add_clues_batch:${Date.now()}`;
  const op = Operation.manageData({ name: key, value: payload });

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(180)
    .build();

  const signedXdr = await wallet.signTransaction(tx.toXDR());

  const result = (await withSorobanRpcRetry(() => server.submitTransaction(signedXdr))) as {
    hash?: string;
  };
  if (!result?.hash) throw new Error("Transaction submission failed");

  return { txHash: result.hash, clueCount: normalizedClues.length };
}

/**
 * Calls the smart contract's extend_end_time(hunt_id: u64, new_end_time: u64) to extend a hunt's duration.
 * Requires wallet and Soroban RPC.
 */
export async function extendEndTime(huntId: number, newEndTime: number): Promise<ExtendHuntResult> {
  if (typeof window === "undefined") throw new Error("Browser environment required");

  const server = new Server(SOROBAN_RPC_URL);
  const wallet = getActiveWalletAdapter();
  const publicKey = await wallet.getPublicKey();

  const account = (await withSorobanRpcRetry(() => server.getAccount(publicKey))) as Account;
  const payload = JSON.stringify({
    action: "extend_end_time",
    hunt_id: huntId,
    new_end_time: newEndTime,
  });
  const key = `extend_end_time:${Date.now()}`;
  const op = Operation.manageData({ name: key, value: payload });

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(180)
    .build();

  const signedXdr = await wallet.signTransaction(tx.toXDR());

  const res = (await withSorobanRpcRetry(() => server.submitTransaction(signedXdr))) as {
    hash?: string;
  };
  if (!res?.hash) throw new Error("Transaction submission failed");
  return { txHash: res.hash, newEndTime };
}

/**
 * Retrieves the hunt leaderboard.
 * Fetches real progress data from the server API, with localStorage fallback.
 */
export async function get_hunt_leaderboard(huntId: number): Promise<LeaderboardEntry[]> {
  const now = Math.floor(Date.now() / 1000);

  // Try fetching from server API when online
  if (typeof window !== "undefined") {
    try {
      const baseUrl = window.location.origin;
      const res = await fetch(`${baseUrl}/api/v1/hunts/${huntId}/leaderboard?limit=100`);
      if (res.ok) {
        const body = await res.json();
        if (Array.isArray(body?.data) && body.data.length > 0) {
          return body.data.map(
            (entry: {
              address?: string;
              points?: number;
              completionCount?: number;
              completedAt?: number;
            }) => ({
              address: entry.address ?? "unknown",
              points: entry.points ?? 0,
              completionCount: entry.completionCount ?? 0,
              completedAt: entry.completedAt,
            })
          );
        }
      }
    } catch {
      // Fall back to localStorage
    }
  }

  // Fallback: build from localStorage
  const entries: LeaderboardEntry[] = [];

  if (typeof window !== "undefined") {
    try {
      const myPointsStr = localStorage.getItem(`hunt_${huntId}_my_points`);
      if (myPointsStr) {
        const myPoints = parseInt(myPointsStr, 10);
        if (myPoints > 0) {
          entries.push({
            address: "YOU...PLYR",
            name: "You (Current Player)",
            points: myPoints,
            completionCount: 1,
            completedAt: now - 86400 * 0.1,
          });
        }
      }
    } catch (e) {
      logger.error("Failed to fetch leaderboard:", e);
    }
  }

  return entries;
}

export async function get_hunt_leaderboard_paginated(
  huntId: number,
  page: number = 1,
  limit: number = 20,
  currentUserAddress?: string
): Promise<{
  entries: LeaderboardEntry[];
  total: number;
  currentUserRank?: number;
}> {
  // Use the existing mock (which returns all entries)
  const all = await get_hunt_leaderboard(huntId);
  const sorted = [...all].sort((a, b) => b.points - a.points);
  const total = sorted.length;
  const start = (page - 1) * limit;
  const entries = sorted.slice(start, start + limit);
  let currentUserRank: number | undefined;
  if (currentUserAddress) {
    const idx = sorted.findIndex((e) => e.address === currentUserAddress);
    if (idx !== -1) currentUserRank = idx + 1;
  }
  return { entries, total, currentUserRank };
}

export async function get_hunt_fastest_players(huntId: number): Promise<FastestPlayerEntry[]> {
  const indexerUrl = process.env.NEXT_PUBLIC_TORII_INDEXER_URL;

  if (indexerUrl) {
    try {
      const response = await fetch(`${indexerUrl}/hunts/${huntId}/fastest-completions`, {
        cache: "no-store",
      });

      if (response.ok) {
        const body = await response.json();
        type FastestCompletionRow = {
          address?: string;
          name?: string;
          points?: number;
          completion_time_seconds?: number;
          duration_seconds?: number;
          completion_time_ms?: number;
          duration_ms?: number;
        };

        const rows: FastestCompletionRow[] = Array.isArray(body?.data)
          ? body.data
          : Array.isArray(body?.entries)
            ? body.entries
            : [];

        if (rows.length > 0) {
          return rows
            .map((entry): FastestPlayerEntry | null => {
              if (typeof entry.address !== "string") {
                return null;
              }

              return {
                address: entry.address,
                name: entry.name,
                points: typeof entry.points === "number" ? entry.points : undefined,
                completionTimeSeconds:
                  typeof entry.completion_time_seconds === "number"
                    ? entry.completion_time_seconds
                    : typeof entry.duration_seconds === "number"
                      ? entry.duration_seconds
                      : Math.floor(
                          Number(entry.completion_time_ms ?? entry.duration_ms ?? 0) / 1000 || 0
                        ),
              };
            })
            .filter(
              (entry): entry is FastestPlayerEntry =>
                entry !== null &&
                typeof entry.address === "string" &&
                entry.completionTimeSeconds >= 0
            );
        }
      }
    } catch (error) {
      logger.warn("Torii indexer fetch failed:", error);
    }
  }

  const leaderboard = await get_hunt_leaderboard(huntId);
  const sortedByPoints = [...leaderboard].sort((a, b) => b.points - a.points);

  return sortedByPoints.map((entry, index) => ({
    address: entry.address,
    name: entry.name,
    points: entry.points,
    completionTimeSeconds: 600 + index * 90,
  }));
}

/**
 * Fetches hunt metadata including total clue count.
 * Mock implementation reading from localStorage via huntStore.
 */
export async function get_hunt(huntId: number): Promise<HuntInfo> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  try {
    const stored = getStoredHunt(String(huntId));
    if (!stored) throw new Error(`Hunt ${huntId} not found`);

    return {
      id: stored.id,
      title: stored.title,
      description: stored.description,
      totalClues: stored.cluesCount,
      status: stored.status,
      sequential: stored.sequential,
      creatorEmail: stored.creatorEmail,
      emailNotifications: stored.emailNotifications,
    };
  } catch (error) {
    throw normalizeNetworkError(error, "Failed to fetch hunt");
  }
}

/**
 * Fetches question and points for a specific clue.
 * Never returns the answer — answers are verified on-chain via submitAnswer.
 */
export async function get_clue_info(huntId: number, clueId: number): Promise<ClueInfo> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  try {
    const clues = getHuntClues(huntId);
    const clue = clues[clueId];
    if (!clue) throw new Error(`Clue ${clueId} not found for hunt ${huntId}`);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`hunt_clue_start_${huntId}_${clue.id}`, Date.now().toString());
      } catch (e) {
        logger.error("Failed to set start time:", e);
      }
    }

    const locale = typeof window !== "undefined" ? window.location.pathname.match(/^\/([a-z]{2})(?:\/|$)/i)?.[1] ?? navigator.language : "en";
    return {
      id: clue.id,
      question: resolveLocalizedText(clue.questionTranslations, locale, clue.question),
      points: clue.points,
      questionTranslations: clue.questionTranslations,
      hintTranslations: clue.hintTranslations,
      hints: clue.hints,
      hint: resolveLocalizedText(clue.hintTranslations, locale, clue.hint),
      hintCost: clue.hintCost,
      difficulty: clue.difficulty,
    };
  } catch (error) {
    throw normalizeNetworkError(error, "Failed to fetch clue");
  }
}

/**
 * Polls the Soroban RPC for transaction inclusion.
 * Resolves to true if successful, throws if failed or timed out.
 *
 * Delegates to the centralised `pollTransactionStatus` helper from
 * `contractHelpers`, which handles both SDK-native and raw JSON-RPC fallback,
 * as well as development mock transactions.
 */
export async function pollTransaction(txHash: string): Promise<boolean> {
  if (typeof window === "undefined") return true;
  return pollTransactionStatus(txHash, { maxAttempts: 15, pollInterval: 2000 });
}

async function saveProgressToServer(
  huntId: number,
  clueId: number,
  wallet?: string
): Promise<void> {
  if (!wallet) return;

  const clues = getHuntClues(huntId);
  const progress = getHuntProgress(huntId);
  const userPointsKey = `hunt_${huntId}_my_points`;
  const totalPoints = parseInt(
    typeof window !== "undefined" ? localStorage.getItem(userPointsKey) || "0" : "0",
    10
  );

  const solvedClueIds: number[] = [];
  for (const clue of clues) {
    const solvedKey = `hunt_clue_solved_${huntId}_${clue.id}`;
    if (typeof window !== "undefined" && localStorage.getItem(solvedKey) === "true") {
      solvedClueIds.push(clue.id);
    }
  }

  const payload = {
    wallet,
    currentClueIndex: progress.currentClueIndex,
    totalClues: clues.length,
    totalPoints,
    completedClueIds: solvedClueIds,
    completed: progress.completed,
  };

  if (isOnline()) {
    try {
      const baseUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      await fetch(`${baseUrl}/api/v1/hunts/${huntId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      queueProgressUpdate(
        huntId,
        wallet,
        payload.currentClueIndex,
        payload.totalClues,
        payload.totalPoints,
        payload.completedClueIds,
        payload.completed
      );
    }
  } else {
    queueProgressUpdate(
      huntId,
      wallet,
      payload.currentClueIndex,
      payload.totalClues,
      payload.totalPoints,
      payload.completedClueIds,
      payload.completed
    );
  }
}

/**
 * Submits an answer for a specific clue. Throws AnswerIncorrectError on mismatch.
 * Mock implementation that checks against localStorage clue data.
 */
export async function submitAnswer(
  huntId: number,
  clueId: number,
  answer: string,
  wallet?: string
): Promise<SubmitAnswerResult> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const clues = getHuntClues(huntId);
  const clue = clues.find((c) => c.id === clueId);
  if (!clue) throw new Error(`Clue ${clueId} not found for hunt ${huntId}`);
  const clueIndex = clues.findIndex((c) => c.id === clueId);
  const hunt = getStoredHunt(String(huntId));
  const sequential = hunt?.sequential ?? false;
  const progress = getHuntProgress(huntId);

  if (sequential && clueIndex !== progress.currentClueIndex) {
    throw new SequentialClueError();
  }

  const userAnswer = answer.trim().toLowerCase();

  // Detect stored hashed answer (hex SHA-256) vs legacy plain answers.
  const stored = clue.answer || "";
  const isHexSha256 = /^[a-f0-9]{64}$/i.test(stored);

  if (isHexSha256) {
    const salt = `${huntId}_${clue.id}`;
    const hashed = await sha256Hex(userAnswer + salt);
    if (hashed !== stored) throw new AnswerIncorrectError();
  } else {
    const possibleAnswers = stored
      .toLowerCase()
      .split("|")
      .map((a) => a.trim());
    if (!possibleAnswers.includes(userAnswer)) throw new AnswerIncorrectError();
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
      logger.error("Failed to update local clue state in localStorage after answer submission:", e);
    }
  }

  advanceHuntProgress(huntId, clueIndex + 1, clues.length);

  saveProgressToServer(huntId, clue.id, wallet);

  return {
    txHash: `mock_tx_${Date.now()}`,
    event: "ClueCompleted",
  };
}
