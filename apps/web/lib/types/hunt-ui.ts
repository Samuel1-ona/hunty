import type { ClueDifficulty, ClueHint } from "./clues";
import type { HuntAgeClassification, HuntDifficulty } from "./hunts";

export interface HuntCard {
  id: number;
  title?: string;
  description?: string;
  link?: string;
  code?: string;
  image?: string;
  /** Progressive hints (up to 3). Supersedes `hint`/`hintCost` when present. */
  hints?: ClueHint[];
  /** @deprecated Use `hints[0]` instead. */
  hint?: string;
  /** @deprecated Use `hints[0].penalty` instead. */
  hintCost?: number;
  points?: number;
  /**
   * Hunt-level difficulty rating surfaced as a badge on the card.
   * HuntCards historically also accepts legacy ClueDifficulty values
   * (passed in from individual clue views), so both are allowed here.
   */
  difficulty?: HuntDifficulty | ClueDifficulty;
  /** Optional IPFS media reference, optionally tagged with a type query param. */
  mediaCid?: string;
}

// HuntDraft and PlayerStats now live in @hunty/types (re-exported above).
export interface HuntDraft {
  id: number;
  title: string;
  description: string;
  link: string;
  code: string;
  image?: string;
  sequential?: boolean;
  maxParticipants?: number;
  ageClassification?: HuntAgeClassification;
}

/**
 * Persisted auto-save snapshot for a hunt creation session.
 * Stored in localStorage keyed by `draftId`, and optionally synced to the
 * cloud for logged-in users.
 */
export interface HuntDraftSave {
  /** Unique identifier for this draft save (UUID). */
  draftId: string;
  /** Human-readable label – defaults to gameName or "Untitled Draft". */
  label: string;
  /** ISO-8601 timestamp of when this snapshot was last written. */
  savedAt: string;
  /** The individual hunt clue cards in this draft. */
  hunts: HuntDraft[];
  /** Game-level metadata. */
  meta: {
    gameName: string;
    startDate: string;
    endDate: string;
    rewardType: "XLM" | "NFT" | "Both";
    sequential: boolean;
    isPrivate: boolean;
    timerEnabled: boolean;
    creatorEmail: string;
    emailNotifications: boolean;
  };
  /** Reward buckets. */
  rewards: Array<{ place: number; amount: number }>;
  /**
   * Whether the draft has been recovered into the editor.
   * Prevents the recovery prompt from showing again for the same draft.
   */
  recovered?: boolean;
}

export interface PlayerStats {
  address: string;
  totalHuntsCompleted: number;
  totalPointsEarned: number;
  totalNftsReceived: number;
  totalCompletionTimeSeconds: number;
  completedHuntsTracked: number;
  averageCompletionTimeSeconds: number;
  lastUpdated: number;
}

export type CoverImageUploadState = "idle" | "uploading" | "succeeded" | "failed";
