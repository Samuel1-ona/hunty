/**
 * NFT metadata validator.
 *
 * Validates a `NftMetadata` object against the SEP-0039 schema before any
 * upload or minting call is attempted.  Always collects ALL errors rather
 * than stopping at the first failure (fail-all strategy).
 *
 * Returns a `ValidationResult` — never throws.
 */

import type { NftMetadata, ValidationResult, ValidationFieldError } from "./types"

/** Maximum allowed serialised metadata size in bytes (64 KB). */
const MAX_METADATA_BYTES = 64 * 1024



/**
 * Validates `metadata` against the SEP-0039 schema.
 *
 * Checks performed:
 *  - `name` present and non-empty
 *  - `description` present (may be empty string, but field must exist)
 *  - `image` present and starts with `ipfs://`
 *  - `attributes` is a non-empty array
 *  - each attribute has `trait_type` (string) and `value` (string | number)
 *  - required hunt traits: `difficulty` and `rank` are present
 *    (`completion_time` is optional — omission is valid)
 *  - serialised size ≤ 64 KB
 */
export function validateNftMetadata(metadata: unknown): ValidationResult {
  const errors: ValidationFieldError[] = []

  if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) {
    errors.push({ field: "metadata", message: "Metadata must be a non-null object." })
    return { valid: false, errors }
  }

  const m = metadata as Record<string, unknown>

  // ── name ──────────────────────────────────────────────────────────────────
  if (typeof m.name !== "string" || m.name.trim() === "") {
    errors.push({
      field: "name",
      message: "name is required and must be a non-empty string.",
    })
  }

  // ── description ───────────────────────────────────────────────────────────
  if (!("description" in m) || typeof m.description !== "string") {
    errors.push({
      field: "description",
      message: "description is required and must be a string.",
    })
  }

  // ── image ─────────────────────────────────────────────────────────────────
  if (typeof m.image !== "string" || !m.image.startsWith("ipfs://")) {
    errors.push({
      field: "image",
      message: "image is required and must be an ipfs:// URI.",
    })
  }

  // ── attributes ────────────────────────────────────────────────────────────
  if (!Array.isArray(m.attributes) || (m.attributes as unknown[]).length === 0) {
    errors.push({
      field: "attributes",
      message: "attributes is required and must be a non-empty array.",
    })
  } else {
    const attrs = m.attributes as unknown[]

    // Per-entry validation
    attrs.forEach((attr, idx) => {
      if (attr === null || typeof attr !== "object" || Array.isArray(attr)) {
        errors.push({
          field: `attributes[${idx}]`,
          message: `attributes[${idx}] must be an object with trait_type and value.`,
        })
        return
      }

      const a = attr as Record<string, unknown>

      if (typeof a.trait_type !== "string") {
        errors.push({
          field: `attributes[${idx}].trait_type`,
          message: `attributes[${idx}].trait_type must be a string.`,
        })
      }

      if (typeof a.value !== "string" && typeof a.value !== "number") {
        errors.push({
          field: `attributes[${idx}].value`,
          message: `attributes[${idx}].value must be a string or number (got ${typeof a.value}).`,
        })
      }
    })

    // Required hunt trait validation (difficulty and rank are mandatory;
    // completion_time is intentionally optional).
    const presentTraits = new Set(
      attrs
        .filter(
          (a): a is Record<string, unknown> =>
            a !== null && typeof a === "object" && !Array.isArray(a)
        )
        .map((a) => a.trait_type as string)
    )

    const requiredNow: Array<"difficulty" | "completion_time" | "rank"> = ["difficulty", "rank"]
    for (const trait of requiredNow) {
      if (!presentTraits.has(trait)) {
        errors.push({
          field: `attributes.${trait}`,
          message: `attributes must include an entry with trait_type "${trait}".`,
        })
      }
    }
  }

  // ── size check ─────────────────────────────────────────────────────────────
  try {
    const serialised = JSON.stringify(metadata)
    const byteLength = new TextEncoder().encode(serialised).byteLength
    if (byteLength > MAX_METADATA_BYTES) {
      errors.push({
        field: "metadata",
        message: `Serialised metadata exceeds the 64 KB limit (got ${byteLength} bytes).`,
      })
    }
  } catch {
    // JSON.stringify failure is unlikely but not a schema error — skip size check.
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Convenience type-guard — returns true and narrows the type to `NftMetadata`
 * when the metadata is valid.
 */
export function isValidNftMetadata(
  metadata: unknown
): metadata is NftMetadata {
  return validateNftMetadata(metadata).valid
}
