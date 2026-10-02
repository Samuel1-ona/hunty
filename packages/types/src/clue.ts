/**
 * Clue domain types shared across web and mobile.
 */

export type ClueDifficulty = "Easy" | "Medium" | "Hard"

/** Supported clue interaction types. Missing `type` values are legacy text clues. */
export const CLUE_TYPES = [
  "text",
  "image",
  "location",
  "qr",
  "multiple-choice",
] as const

export type ClueType = (typeof CLUE_TYPES)[number]

/** How players are asked to solve an image clue. */
export type ImageClueMode = "identify-object" | "spot-difference"

/** One creator-defined answer option for a multiple-choice clue. */
export interface ClueChoiceOption {
  id: string
  label: string
}

/** Multiple-choice configuration. `correctOptionId` is creator/player private. */
export interface MultipleChoiceConfig {
  options: ClueChoiceOption[]
  correctOptionId: string
}

/** A fully-specified clue as stored/served for a hunt. */
export interface Clue {
  id: number
  huntId: number
  question: string
  answer: string
  points: number
  /** Interaction type. Omitted values from legacy clues are treated as `text`. */
  type?: ClueType
  /** IPFS CID or URL for the image presented by an image clue. */
  imageCid?: string
  /** Whether an image clue asks for an object or a difference. */
  imageMode?: ImageClueMode
  /** Exact payload encoded in the QR code expected by a QR clue. */
  qrPayload?: string
  /** Options and correct answer for a multiple-choice clue. */
  multipleChoice?: MultipleChoiceConfig
  /** Optional locale-specific question strings. Base `question` remains the fallback. */
  questionTranslations?: Partial<Record<string, string>>
  /** Optional locale-specific hint strings. Base `hint` remains the fallback. */
  hintTranslations?: Partial<Record<string, string>>
  hint?: string
  hintCost?: number
  /** Optional difficulty tag set by the creator. */
  difficulty?: ClueDifficulty
  /** Center latitude for the clue's answer geofence. */
  latitude?: number
  /** Center longitude for the clue's answer geofence. */
  longitude?: number
  /** Allowed distance from the clue center in metres. Defaults to 100m. */
  geofenceRadiusMeters?: number
}

/** Public projection of a clue (no answer) served to players. */
export interface ClueInfo {
  id: number
  question: string
  points: number
  /** Interaction type. Never includes creator-private answer configuration. */
  type?: ClueType
  imageCid?: string
  imageMode?: ImageClueMode
  /** Public options only; the correct option ID is deliberately omitted. */
  multipleChoice?: {
    options: ClueChoiceOption[]
  }
  /** Radius shown to the player; target coordinates remain private. */
  geofenceRadiusMeters?: number
  questionTranslations?: Partial<Record<string, string>>
  hintTranslations?: Partial<Record<string, string>>
  hint?: string
  hintCost?: number
  difficulty?: ClueDifficulty
}

/** Creator-side clue row including the answer. */
export interface ClueRow {
  id: number
  question: string
  answer: string
  points: number
  type?: ClueType
  imageCid?: string
  imageMode?: ImageClueMode
  qrPayload?: string
  multipleChoice?: MultipleChoiceConfig
  latitude?: number
  longitude?: number
  geofenceRadiusMeters?: number
  questionTranslations?: Partial<Record<string, string>>
  hintTranslations?: Partial<Record<string, string>>
  hint?: string
  hintCost?: number
  difficulty?: ClueDifficulty
}
