import { logger } from "@/lib/logger";

export const FIRST_HUNT_GUIDE_STORAGE_KEY = "hunty-first-hunt-guide";
export const FIRST_HUNT_GUIDE_EVENT = "hunty:first-hunt-guide";
export const OPEN_WALLET_EVENT = "hunty:open-wallet";

export const FIRST_HUNT_STEP_IDS = ["connect", "join", "solve", "claim"] as const;

export type FirstHuntStepId = (typeof FIRST_HUNT_STEP_IDS)[number];

export interface FirstHuntStepDefinition {
  id: FirstHuntStepId;
  title: string;
  description: string;
  href: string;
}

export const FIRST_HUNT_STEPS: readonly FirstHuntStepDefinition[] = [
  {
    id: "connect",
    title: "Connect wallet",
    description: "Link a Stellar wallet so you can join hunts and receive rewards.",
    href: "/",
  },
  {
    id: "join",
    title: "Join a hunt",
    description: "Register for an active scavenger hunt from the arcade.",
    href: "/#discovery-arcade",
  },
  {
    id: "solve",
    title: "Solve a clue",
    description: "Unlock your first clue and start scoring points.",
    href: "/#discovery-arcade",
  },
  {
    id: "claim",
    title: "Claim your reward",
    description: "Collect XLM or an NFT after you finish the hunt.",
    href: "/profile",
  },
];

export interface FirstHuntGuideState {
  version: 1;
  dismissed: boolean;
  collapsed: boolean;
  completed: Record<FirstHuntStepId, boolean>;
  huntId: number | null;
  updatedAt: number;
}

export interface FirstHuntProgress {
  completedCount: number;
  total: number;
  nextStep: FirstHuntStepDefinition | null;
  allComplete: boolean;
}

export interface FirstHuntKnownProgress {
  connected?: boolean;
  joined?: boolean;
  solved?: boolean;
  claimed?: boolean;
  huntId?: number;
}

const EMPTY_COMPLETED: Record<FirstHuntStepId, boolean> = {
  connect: false,
  join: false,
  solve: false,
  claim: false,
};

/** Later steps imply earlier ones so a returning player is not sent backwards. */
const STEP_PREREQUISITES: Record<FirstHuntStepId, FirstHuntStepId[]> = {
  connect: [],
  join: ["connect"],
  solve: ["connect", "join"],
  claim: ["connect", "join", "solve"],
};

export function getDefaultFirstHuntGuideState(): FirstHuntGuideState {
  return {
    version: 1,
    dismissed: false,
    collapsed: false,
    completed: { ...EMPTY_COMPLETED },
    huntId: null,
    updatedAt: 0,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFirstHuntStepId(value: unknown): value is FirstHuntStepId {
  return FIRST_HUNT_STEP_IDS.includes(value as FirstHuntStepId);
}

export function normalizeFirstHuntGuideState(raw: unknown): FirstHuntGuideState {
  const fallback = getDefaultFirstHuntGuideState();
  if (!isRecord(raw)) return fallback;

  const completed = { ...EMPTY_COMPLETED };
  if (isRecord(raw.completed)) {
    for (const step of FIRST_HUNT_STEP_IDS) {
      completed[step] = raw.completed[step] === true;
    }
  }

  const huntId =
    typeof raw.huntId === "number" && Number.isFinite(raw.huntId) && raw.huntId > 0
      ? raw.huntId
      : null;

  return {
    version: 1,
    dismissed: raw.dismissed === true,
    collapsed: raw.collapsed === true,
    completed,
    huntId,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
  };
}

function emitGuideChange(state: FirstHuntGuideState): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FIRST_HUNT_GUIDE_EVENT, { detail: state }));
}

export function loadFirstHuntGuideState(): FirstHuntGuideState {
  if (typeof window === "undefined") {
    return getDefaultFirstHuntGuideState();
  }

  try {
    const item = window.localStorage.getItem(FIRST_HUNT_GUIDE_STORAGE_KEY);
    if (!item) return getDefaultFirstHuntGuideState();
    return normalizeFirstHuntGuideState(JSON.parse(item));
  } catch (error) {
    logger.warn(`Error reading localStorage key "${FIRST_HUNT_GUIDE_STORAGE_KEY}":`, error);
    return getDefaultFirstHuntGuideState();
  }
}

export function saveFirstHuntGuideState(state: FirstHuntGuideState): FirstHuntGuideState {
  const next: FirstHuntGuideState = {
    ...state,
    version: 1,
    completed: { ...state.completed },
    updatedAt: Date.now(),
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(FIRST_HUNT_GUIDE_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      logger.warn(`Error setting localStorage key "${FIRST_HUNT_GUIDE_STORAGE_KEY}":`, error);
    }
    emitGuideChange(next);
  }

  return next;
}

function withImpliedSteps(
  completed: Record<FirstHuntStepId, boolean>
): Record<FirstHuntStepId, boolean> {
  const next = { ...completed };
  for (const step of FIRST_HUNT_STEP_IDS) {
    if (!next[step]) continue;
    for (const prerequisite of STEP_PREREQUISITES[step]) {
      next[prerequisite] = true;
    }
  }
  return next;
}

export function getFirstHuntProgress(state: FirstHuntGuideState): FirstHuntProgress {
  const completedCount = FIRST_HUNT_STEP_IDS.filter((step) => state.completed[step]).length;
  const nextStep =
    FIRST_HUNT_STEPS.find((step) => !state.completed[step.id]) ?? null;

  return {
    completedCount,
    total: FIRST_HUNT_STEP_IDS.length,
    nextStep,
    allComplete: completedCount === FIRST_HUNT_STEP_IDS.length,
  };
}

export function markFirstHuntStep(
  step: FirstHuntStepId,
  extra?: { huntId?: number }
): FirstHuntGuideState {
  const current = loadFirstHuntGuideState();
  const completed = withImpliedSteps({
    ...current.completed,
    [step]: true,
  });

  return saveFirstHuntGuideState({
    ...current,
    completed,
    huntId: extra?.huntId ?? current.huntId,
  });
}

export function dismissFirstHuntGuide(): FirstHuntGuideState {
  const current = loadFirstHuntGuideState();
  return saveFirstHuntGuideState({
    ...current,
    dismissed: true,
    collapsed: true,
  });
}

export function restoreFirstHuntGuide(): FirstHuntGuideState {
  const current = loadFirstHuntGuideState();
  return saveFirstHuntGuideState({
    ...current,
    dismissed: false,
    collapsed: false,
  });
}

export function setFirstHuntGuideCollapsed(collapsed: boolean): FirstHuntGuideState {
  const current = loadFirstHuntGuideState();
  return saveFirstHuntGuideState({
    ...current,
    collapsed,
  });
}

export function applyKnownFirstHuntProgress(
  known: FirstHuntKnownProgress
): FirstHuntGuideState {
  const current = loadFirstHuntGuideState();
  const completed = { ...current.completed };

  if (known.connected) completed.connect = true;
  if (known.joined) completed.join = true;
  if (known.solved) completed.solve = true;
  if (known.claimed) completed.claim = true;

  return saveFirstHuntGuideState({
    ...current,
    completed: withImpliedSteps(completed),
    huntId: known.huntId ?? current.huntId,
  });
}

function readStorageKeys(): string[] {
  if (typeof window === "undefined") return [];
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key) keys.push(key);
  }
  return keys;
}

function parseHuntIdFromKey(key: string, prefix: string): number | null {
  const suffix = key.slice(prefix.length);
  const match = suffix.match(/^(\d+)/);
  if (!match) return null;
  const huntId = Number(match[1]);
  return Number.isFinite(huntId) && huntId > 0 ? huntId : null;
}

function hasWalletAddressInStore(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem("hunty-wallet");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { state?: { walletAddress?: string } };
    return Boolean(parsed?.state?.walletAddress);
  } catch {
    return false;
  }
}

/**
 * Rebuilds checklist progress from existing Hunty storage so a returning
 * session is not reset to "connect wallet".
 */
export function inferFirstHuntProgressFromStorage(playerAddress?: string): FirstHuntKnownProgress {
  const known: FirstHuntKnownProgress = {};
  if (typeof window === "undefined") return known;

  const keys = readStorageKeys();
  const normalizedAddress = playerAddress?.trim() ?? "";

  if (normalizedAddress || hasWalletAddressInStore()) {
    known.connected = true;
  }

  const joinedFromAttempts = keys.some(
    (key) =>
      key.startsWith("hunty_active_attempt_") || key.startsWith("hunty_hunt_attempts_")
  );
  if (joinedFromAttempts) {
    known.joined = true;
  }

  let inferredHuntId: number | null = null;

  for (const key of keys) {
    if (key.startsWith("hunt_completed_")) {
      known.solved = true;
      known.joined = true;
      inferredHuntId = inferredHuntId ?? parseHuntIdFromKey(key, "hunt_completed_");
    }
    if (key.startsWith("hunt_clue_solved_")) {
      known.solved = true;
      known.joined = true;
      inferredHuntId = inferredHuntId ?? parseHuntIdFromKey(key, "hunt_clue_solved_");
    }
  }

  if (normalizedAddress) {
    try {
      const attemptsRaw = window.localStorage.getItem(`hunty_hunt_attempts_${normalizedAddress}`);
      if (attemptsRaw) {
        const attempts = JSON.parse(attemptsRaw) as Array<{
          huntId?: number;
          status?: string;
          clues?: unknown[];
        }>;
        if (Array.isArray(attempts) && attempts.length > 0) {
          known.joined = true;
          const completed = attempts.find((attempt) => attempt.status === "completed");
          const withClues = attempts.find((attempt) => (attempt.clues?.length ?? 0) > 0);
          if (completed || withClues) {
            known.solved = true;
          }
          inferredHuntId =
            inferredHuntId ?? completed?.huntId ?? attempts[0]?.huntId ?? null;
        }
      }
    } catch {
      // Ignore malformed attempt history and keep inferred flags from keys.
    }
  }

  if (inferredHuntId) {
    known.huntId = inferredHuntId;
  }

  return known;
}

export function hydrateFirstHuntGuide(playerAddress?: string): FirstHuntGuideState {
  const inferred = inferFirstHuntProgressFromStorage(playerAddress);
  return applyKnownFirstHuntProgress(inferred);
}

export function requestWalletConnect(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_WALLET_EVENT));
}

export function getFirstHuntStepHref(
  step: FirstHuntStepDefinition,
  huntId: number | null
): string {
  if ((step.id === "solve" || step.id === "claim" || step.id === "join") && huntId) {
    return `/hunt/${huntId}`;
  }
  return step.href;
}
