/**
 * NFT metadata types aligned with Stellar SEP-0039 (and the OpenSea/ERC-1155
 * metadata convention it references).
 *
 * All NFT modules import from this file — never redeclare locally.
 */

// ─── Attribute ────────────────────────────────────────────────────────────────

/**
 * A single entry in the `attributes` array.
 * Both `trait_type` and `value` are required; `value` may be a string or
 * number (booleans are serialised as strings for broad marketplace compat).
 */
export interface NftAttribute {
  trait_type: string
  value: string | number
}

// ─── Core Metadata Object ─────────────────────────────────────────────────────

/**
 * SEP-0039 compliant NFT metadata object.
 *
 * Required fields:
 *   name        — human-readable token name
 *   description — human-readable description
 *   image       — ipfs:// URI pointing to the NFT artwork
 *   attributes  — typed trait array (at minimum: difficulty, completion_time, rank)
 *
 * Optional extension fields approved for Hunty:
 *   earned_at   — ISO-8601 timestamp when the reward was earned
 *   external_url — optional link back to the hunt page
 */
export interface NftMetadata {
  /** Human-readable name of the NFT, e.g. "Hunty Trophy — Hunt #42 · 1st Place" */
  name: string
  /** Human-readable description summarising the hunt and completion event */
  description: string
  /** ipfs:// URI for the NFT artwork image */
  image: string
  /** Array of typed trait objects; must contain difficulty, completion_time, rank */
  attributes: NftAttribute[]
  /** ISO-8601 timestamp — when the reward was earned (Hunty extension field) */
  earned_at?: string
  /** Optional link back to the hunt page (Hunty extension field) */
  external_url?: string
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationFieldError {
  /** Dot-path of the failing field, e.g. "attributes.difficulty" */
  field: string
  /** Human-readable description of the violated constraint */
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationFieldError[]
}

// ─── Builder Inputs ───────────────────────────────────────────────────────────

export interface NftMetadataBuildInput {
  /** Human-readable NFT name */
  name: string
  /** Human-readable description */
  description: string
  /** Bare CID or ipfs:// URI for the NFT image */
  imageCid: string
  /** Hunt difficulty level */
  difficulty: "Easy" | "Medium" | "Hard" | "Unrated"
  /** Player's total completion time in whole seconds; omit if unavailable */
  completionTimeSeconds?: number
  /** Player's final leaderboard rank (1 = first place) */
  rank: number
  /** Optional hunt name stored as an extra attribute */
  huntName?: string
  /** ISO-8601 timestamp when the reward was earned */
  earnedAt?: string
  /** Optional link back to the hunt page */
  externalUrl?: string
}

// ─── Upload Result ────────────────────────────────────────────────────────────

export interface MetadataUploadResult {
  /** ipfs:// URI pointing to the uploaded metadata JSON */
  metadataUri: string
  /** Raw CID returned by the IPFS proxy */
  cid: string
}
