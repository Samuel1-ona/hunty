"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { debounce } from "@/lib/debounce";
import { logger } from "@/lib/logger";
import type { HuntDraft, HuntDraftSave, Reward } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Debounce delay before writing to localStorage (ms). */
const LOCAL_SAVE_DELAY_MS = 1_500;

/** Debounce delay before attempting cloud sync (ms). */
const CLOUD_SYNC_DELAY_MS = 5_000;

/** localStorage key prefix for saved drafts index. */
export const DRAFT_INDEX_KEY = "hunty_draft_index";

/** localStorage key template for individual draft payloads. */
export const draftPayloadKey = (id: string) => `hunty_draft_${id}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Read the list of all saved draft IDs from the index. */
function readDraftIndex(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DRAFT_INDEX_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Write the list of all saved draft IDs to the index. */
function writeDraftIndex(ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRAFT_INDEX_KEY, JSON.stringify(ids));
}

/** Read a specific draft payload from localStorage, or null if missing. */
export function readDraftPayload(draftId: string): HuntDraftSave | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(draftPayloadKey(draftId));
    return raw ? (JSON.parse(raw) as HuntDraftSave) : null;
  } catch {
    return null;
  }
}

/** Write a draft payload and update the index. */
function writeDraftPayload(draft: HuntDraftSave): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(draftPayloadKey(draft.draftId), JSON.stringify(draft));
  const index = readDraftIndex();
  if (!index.includes(draft.draftId)) {
    writeDraftIndex([...index, draft.draftId]);
  }
}

/** Remove a draft from localStorage and the index. */
export function deleteDraft(draftId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(draftPayloadKey(draftId));
  const index = readDraftIndex();
  writeDraftIndex(index.filter((id) => id !== draftId));
}

/** Return all saved drafts, newest first. */
export function listAllDrafts(): HuntDraftSave[] {
  const ids = readDraftIndex();
  const drafts: HuntDraftSave[] = [];
  for (const id of ids) {
    const draft = readDraftPayload(id);
    if (draft) drafts.push(draft);
  }
  return drafts.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
}

/** Mark a draft as recovered so the recovery prompt doesn't re-appear. */
export function markDraftRecovered(draftId: string): void {
  const draft = readDraftPayload(draftId);
  if (!draft) return;
  writeDraftPayload({ ...draft, recovered: true });
}

/** Generate a simple UUID-v4-like identifier (browser-safe). */
function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Cloud sync ───────────────────────────────────────────────────────────────

/**
 * Persists a hunt draft to the server for logged-in users.
 * POSTs to /api/v1/drafts — backed by the `hunt_drafts` PostgreSQL table.
 *
 * @returns true if the sync succeeded, false otherwise.
 */
async function syncDraftToCloud(draft: HuntDraftSave, walletPublicKey: string): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, ownerKey: walletPublicKey }),
    });
    if (!res.ok) {
      logger.warn(`[DraftAutoSave] cloud sync failed (${res.status}) for draft ${draft.draftId}`);
      return false;
    }
    logger.info(
      `[DraftAutoSave] cloud sync OK for draft ${draft.draftId} (owner: ${walletPublicKey})`
    );
    return true;
  } catch (err) {
    logger.warn("[DraftAutoSave] cloud sync failed:", err);
    return false;
  }
}

/**
 * Fetches a single draft from the server by ID.
 * Used to recover a draft on a device where it was never auto-saved locally.
 *
 * @returns the draft, or null if it doesn't exist or the request failed.
 */
export async function fetchDraftFromServer(draftId: string): Promise<HuntDraftSave | null> {
  try {
    const res = await fetch(`/api/v1/drafts/${draftId}`);
    if (!res.ok) return null;
    const { draft } = (await res.json()) as { draft: HuntDraftSave };
    return draft;
  } catch (err) {
    logger.warn("[DraftAutoSave] fetch draft failed:", err);
    return null;
  }
}

/**
 * Fetches all drafts owned by a wallet from the server, newest first.
 * Used to show a creator's drafts on a device where they weren't auto-saved
 * locally (i.e. after a browser clear or on a new device).
 */
export async function fetchDraftsFromServer(ownerKey: string): Promise<HuntDraftSave[]> {
  try {
    const res = await fetch(`/api/v1/drafts?ownerKey=${encodeURIComponent(ownerKey)}`);
    if (!res.ok) return [];
    const { drafts } = (await res.json()) as { drafts: HuntDraftSave[] };
    return drafts;
  } catch (err) {
    logger.warn("[DraftAutoSave] fetch drafts failed:", err);
    return [];
  }
}

/** Deletes a draft's server-side copy. Best-effort — errors are swallowed. */
export async function deleteDraftFromServer(draftId: string): Promise<void> {
  try {
    await fetch(`/api/v1/drafts/${draftId}`, { method: "DELETE" });
  } catch (err) {
    logger.warn("[DraftAutoSave] server delete failed:", err);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseHuntDraftAutoSaveOptions {
  /** Current draft content to track. */
  hunts: HuntDraft[];
  rewards: Reward[];
  meta: HuntDraftSave["meta"];
  /**
   * If provided, the hook will attempt cloud sync after the local save.
   * Typically the Freighter/wallet public key for logged-in users.
   */
  walletPublicKey?: string;
  /**
   * Existing draftId to update.  Pass undefined when starting a new draft;
   * the hook will mint a new ID on the first save.
   */
  draftId?: string;
}

export interface UseHuntDraftAutoSaveReturn {
  /** Current save lifecycle status. */
  saveStatus: SaveStatus;
  /** The (possibly newly-generated) ID for the active draft. */
  activeDraftId: string | null;
  /** Immediately flush a save without waiting for the debounce timer. */
  saveNow: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * `useHuntDraftAutoSave`
 *
 * Watches the creator's form state and:
 *  1. Debounces writes to localStorage (1.5 s after last change).
 *  2. Debounces cloud sync for logged-in users (5 s after last change).
 *
 * The hook also exposes `saveNow()` so a manual "Save" button can flush
 * immediately without waiting for the debounce.
 */
export function useHuntDraftAutoSave({
  hunts,
  rewards,
  meta,
  walletPublicKey,
  draftId: initialDraftId,
}: UseHuntDraftAutoSaveOptions): UseHuntDraftAutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  // Expose activeDraftId as state so the return value is stable across renders.
  const [activeDraftId] = useState<string>(() => initialDraftId ?? generateId());
  const activeDraftIdRef = useRef<string>(activeDraftId);

  // Keep refs for the latest values to avoid stale closures inside debounced fns.
  const huntsRef = useRef(hunts);
  const rewardsRef = useRef(rewards);
  const metaRef = useRef(meta);
  const walletRef = useRef(walletPublicKey);

  useEffect(() => {
    huntsRef.current = hunts;
  }, [hunts]);
  useEffect(() => {
    rewardsRef.current = rewards;
  }, [rewards]);
  useEffect(() => {
    metaRef.current = meta;
  }, [meta]);
  useEffect(() => {
    walletRef.current = walletPublicKey;
  }, [walletPublicKey]);

  // ── Core save logic (runs for both auto and manual saves) ──────────────────
  const performSave = useCallback(async () => {
    const draftId = activeDraftIdRef.current;
    const label = metaRef.current.gameName?.trim() || "Untitled Draft";

    const snapshot: HuntDraftSave = {
      draftId,
      label,
      savedAt: new Date().toISOString(),
      hunts: huntsRef.current,
      rewards: rewardsRef.current.map(({ place, amount }) => ({ place, amount })),
      meta: metaRef.current,
      recovered: false,
    };

    setSaveStatus("saving");
    try {
      writeDraftPayload(snapshot);
      logger.info(`[DraftAutoSave] saved draft ${draftId} to localStorage`);

      // Cloud sync for logged-in users — only report "saved" once the
      // server has actually confirmed the write.
      if (walletRef.current) {
        const synced = await syncDraftToCloud(snapshot, walletRef.current);
        setSaveStatus(synced ? "saved" : "error");
        return;
      }

      setSaveStatus("saved");
    } catch (err) {
      logger.error("[DraftAutoSave] failed to write draft:", err);
      setSaveStatus("error");
    }
  }, []);

  // ── Debounced auto-save triggers ───────────────────────────────────────────
  // Refs hold the debounced functions so they are stable across renders and
  // can be cancelled on unmount without creating new debounce instances.
  const debouncedLocalSaveRef = useRef<ReturnType<typeof debounce> | null>(null);
  const debouncedCloudSyncRef = useRef<ReturnType<typeof debounce> | null>(null);

  useEffect(() => {
    debouncedLocalSaveRef.current = debounce(() => {
      void performSave();
    }, LOCAL_SAVE_DELAY_MS);
    debouncedCloudSyncRef.current = debounce(() => {
      void performSave();
    }, CLOUD_SYNC_DELAY_MS);
    return () => {
      debouncedLocalSaveRef.current?.cancel();
      debouncedCloudSyncRef.current?.cancel();
    };
  }, [performSave]);

  // Trigger auto-save whenever form state changes.
  useEffect(() => {
    debouncedLocalSaveRef.current?.();
    if (walletPublicKey) {
      debouncedCloudSyncRef.current?.();
    }
  }, [hunts, rewards, meta, walletPublicKey]); // eslint-disable-line react-hooks/exhaustive-deps -- debounced save handlers are stored in refs to remain stable across renders while saving updated form state (hunts, rewards, meta, walletPublicKey)

  // ── Manual save (exposed via saveNow) ─────────────────────────────────────
  const saveNow = useCallback(async () => {
    debouncedLocalSaveRef.current?.cancel();
    debouncedCloudSyncRef.current?.cancel();
    await performSave();
  }, [performSave]);

  return {
    saveStatus,
    activeDraftId,
    saveNow,
  };
}
