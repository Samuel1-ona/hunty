import type { HuntProgressSnapshot } from "./huntStoreCore";

const HUNT_PROGRESS_KEY_PREFIX = "hunty_hunt_progress_";

function getProgressKey(huntId: number): string {
  return `${HUNT_PROGRESS_KEY_PREFIX}${huntId}`;
}

export function getWalletProgressKey(huntId: number, walletAddress: string): string {
  if (!walletAddress?.trim()) return getProgressKey(huntId);
  return `hunty_hunt_progress_wallet_${walletAddress.trim().toLowerCase()}_${huntId}`;
}

function getWalletAddressFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  for (const key of ["freighter_public_key", "wallet_public_key", "hunty_wallet_public_key"]) {
    const value = localStorage.getItem(key)?.trim();
    if (value) return value;
  }
  const walletStoreRaw = localStorage.getItem("hunty_wallet_store");
  if (!walletStoreRaw) return null;
  try {
    const parsed = JSON.parse(walletStoreRaw) as {
      state?: { publicKey?: string };
      publicKey?: string;
    };
    const value = parsed?.state?.publicKey ?? parsed?.publicKey;
    return typeof value === "string" && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

function resolveProgressStorageKey(huntId: number, walletAddress?: string | null): string {
  const activeWalletAddress = walletAddress?.trim() || getWalletAddressFromStorage();
  return activeWalletAddress
    ? getWalletProgressKey(huntId, activeWalletAddress)
    : getProgressKey(huntId);
}

function readProgressEntry(
  huntId: number,
  walletAddress?: string | null
): HuntProgressSnapshot | null {
  if (typeof window === "undefined") return null;
  const activeWalletAddress = walletAddress?.trim() || getWalletAddressFromStorage();
  const walletKey = activeWalletAddress ? getWalletProgressKey(huntId, activeWalletAddress) : null;
  try {
    if (walletKey) {
      const walletRaw = localStorage.getItem(walletKey);
      if (walletRaw) return JSON.parse(walletRaw) as HuntProgressSnapshot;
    }
    const legacyRaw = localStorage.getItem(getProgressKey(huntId));
    return legacyRaw ? (JSON.parse(legacyRaw) as HuntProgressSnapshot) : null;
  } catch {
    return null;
  }
}

function writeProgressEntry(progress: HuntProgressSnapshot, walletAddress?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      resolveProgressStorageKey(progress.huntId, walletAddress),
      JSON.stringify(progress)
    );
    localStorage.setItem(getProgressKey(progress.huntId), JSON.stringify(progress));
  } catch {
    // Ignore storage failures to preserve the existing browser behavior.
  }
}

function mergeProgressSnapshots(
  current: HuntProgressSnapshot,
  incoming: HuntProgressSnapshot
): HuntProgressSnapshot {
  const currentClueIndex = Math.max(current.currentClueIndex, incoming.currentClueIndex);
  const startedAt = Math.min(
    current.startedAt || incoming.startedAt,
    incoming.startedAt || current.startedAt || Date.now()
  );
  const completed = current.completed || incoming.completed;
  const completedAt =
    current.completedAt && incoming.completedAt
      ? Math.max(new Date(current.completedAt).getTime(), new Date(incoming.completedAt).getTime())
      : (current.completedAt ?? incoming.completedAt);
  return {
    ...current,
    ...incoming,
    huntId: current.huntId || incoming.huntId,
    currentClueIndex,
    startedAt,
    completed,
    completedAt,
  };
}

export function migrateGuestProgressToWallet(
  walletAddressOrHuntId: string | number,
  walletAddressOrHuntIdValue?: string | number | null
): HuntProgressSnapshot | null {
  if (typeof window === "undefined") return null;
  const isWalletArgumentFirst = typeof walletAddressOrHuntId === "string";
  const walletAddress = (
    isWalletArgumentFirst ? walletAddressOrHuntId : String(walletAddressOrHuntIdValue ?? "")
  ).trim();
  const huntId = isWalletArgumentFirst
    ? Number(walletAddressOrHuntIdValue ?? NaN)
    : Number(walletAddressOrHuntId);
  if (!walletAddress) return null;
  const hasSpecificHunt = Number.isFinite(huntId);
  const guestKeys = hasSpecificHunt
    ? [getProgressKey(huntId)]
    : Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
        .filter(
          (key): key is string =>
            typeof key === "string" && key.startsWith(HUNT_PROGRESS_KEY_PREFIX)
        )
        .filter((key) => !key.includes("wallet_"));
  let lastMigrated: HuntProgressSnapshot | null = null;
  for (const guestKey of guestKeys) {
    const guestHuntId = Number(guestKey.replace(HUNT_PROGRESS_KEY_PREFIX, ""));
    if (!Number.isFinite(guestHuntId)) continue;
    let guestProgress: HuntProgressSnapshot | null;
    try {
      const raw = localStorage.getItem(guestKey);
      guestProgress = raw ? (JSON.parse(raw) as HuntProgressSnapshot) : null;
    } catch {
      guestProgress = null;
    }
    if (!guestProgress) continue;
    let storedWalletProgress: HuntProgressSnapshot | null;
    try {
      const raw = localStorage.getItem(getWalletProgressKey(guestHuntId, walletAddress));
      storedWalletProgress = raw ? (JSON.parse(raw) as HuntProgressSnapshot) : null;
    } catch {
      storedWalletProgress = null;
    }
    const mergedProgress = storedWalletProgress
      ? mergeProgressSnapshots(storedWalletProgress, guestProgress)
      : guestProgress;
    localStorage.setItem(
      getWalletProgressKey(guestHuntId, walletAddress),
      JSON.stringify(mergedProgress)
    );
    localStorage.removeItem(guestKey);
    lastMigrated = mergedProgress;
    if (hasSpecificHunt) return mergedProgress;
  }
  return lastMigrated;
}

export function getHuntProgress(
  huntId: number,
  walletAddress?: string | null
): HuntProgressSnapshot {
  const existing = readProgressEntry(huntId, walletAddress);
  if (existing) return existing;
  const initial = { huntId, currentClueIndex: 0, startedAt: Date.now(), completed: false };
  writeProgressEntry(initial, walletAddress);
  return initial;
}

export function startHuntProgress(
  huntId: number,
  walletAddress?: string | null
): HuntProgressSnapshot {
  const current = getHuntProgress(huntId, walletAddress);
  const next = { ...current, startedAt: current.startedAt || Date.now() };
  writeProgressEntry(next, walletAddress);
  return next;
}

export function advanceHuntProgress(
  huntId: number,
  nextClueIndex: number,
  totalClues: number,
  walletAddress?: string | null
): HuntProgressSnapshot {
  const current = getHuntProgress(huntId, walletAddress);
  const completed = nextClueIndex >= totalClues;
  const next = {
    ...current,
    currentClueIndex: Math.max(current.currentClueIndex, nextClueIndex),
    completed,
    completedAt: completed ? Date.now() : current.completedAt,
  };
  writeProgressEntry(next, walletAddress);
  return next;
}

export function clearHuntProgress(huntId: number, walletAddress?: string | null): void {
  if (typeof window !== "undefined")
    localStorage.removeItem(resolveProgressStorageKey(huntId, walletAddress));
}

export { getProgressKey, HUNT_PROGRESS_KEY_PREFIX };
