import type { AnswerStrictness } from "../fuzzyAnswer";

export type ClueDifficulty = "Easy" | "Medium" | "Hard";

/**
 * A single progressive hint entry. Creators can define up to 3 hints per clue.
 * Each hint is revealed in order and may carry an optional score penalty and
 * a minimum delay (in seconds) that must elapse after the previous hint before
 * this one can be revealed.
 */
export interface ClueHint {
  /** The hint text shown to the player. */
  text: string;
  /** Points deducted from the clue score when this hint is revealed. */
  penalty: number;
  /** Seconds the player must wait after the previous hint before revealing this one. */
  delaySeconds: number;
}

export interface Clue {
  id: number;
  huntId: number;
  question: string;
  answer: string;
  points: number;
  /** Optional locale-specific question strings. The base `question` remains the fallback. */
  questionTranslations?: Partial<Record<string, string>>;
  /** Optional locale-specific hint strings. The base `hint` remains the fallback. */
  hintTranslations?: Partial<Record<string, string>>;
  /**
   * Progressive hints array (up to 3). Takes precedence over the legacy
   * `hint` / `hintCost` fields when present.
   */
  hints?: ClueHint[];
  /** @deprecated Use `hints[0]` instead. Kept for backwards compatibility. */
  hint?: string;
  /** @deprecated Use `hints[0].penalty` instead. Kept for backwards compatibility. */
  hintCost?: number;
  /** Optional difficulty tag set by the creator. */
  difficulty?: ClueDifficulty;
  /** Center latitude for the clue's answer geofence. */
  latitude?: number;
  /** Center longitude for the clue's answer geofence. */
  longitude?: number;
  /** Allowed distance from the clue center in metres. Defaults to 100m. */
  geofenceRadiusMeters?: number;
  /** Creator-specified accepted alternative answers (plaintext). */
  alternativeAnswers?: string[];
  /** Fuzzy matching strictness for this clue. Defaults to "normal". */
  answerStrictness?: AnswerStrictness;
  /** Optional IPFS media reference, optionally tagged with a type query param. */
  mediaCid?: string;
  /** Optional A/B variants. When present, players may be assigned to A or B. */
  variants?: {
    A?: {
      question?: string;
      answer: string;
      alternativeAnswers?: string[];
      answerStrictness?: AnswerStrictness;
      hints?: ClueHint[];
    };
    B?: {
      question?: string;
      answer: string;
      alternativeAnswers?: string[];
      answerStrictness?: AnswerStrictness;
      hints?: ClueHint[];
    };
  };
}

export type ClueInfo = {
  id: number;
  question: string;
  points: number;
  /** Optional locale-specific question strings. */
  questionTranslations?: Partial<Record<string, string>>;
  /** Optional locale-specific hint strings. */
  hintTranslations?: Partial<Record<string, string>>;
  /** Progressive hints (up to 3). Supersedes the legacy `hint`/`hintCost` fields. */
  hints?: ClueHint[];
  /** @deprecated Use `hints[0]` instead. */
  hint?: string;
  /** @deprecated Use `hints[0].penalty` instead. */
  hintCost?: number;
  difficulty?: ClueDifficulty;
};

export interface ClueRow {
  id: number;
  question: string;
  answer: string;
  points: number;
  questionTranslations?: Partial<Record<string, string>>;
  hintTranslations?: Partial<Record<string, string>>;
  hints?: ClueHint[];
  /** @deprecated */
  hint?: string;
  /** @deprecated */
  hintCost?: number;
  difficulty?: ClueDifficulty;
  alternativeAnswers?: string[];
  answerStrictness?: AnswerStrictness;
  /** Optional IPFS media reference, optionally tagged with a type query param. */
  mediaCid?: string;
}
