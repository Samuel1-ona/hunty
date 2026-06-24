/**
 * NFT metadata builder.
 *
 * Assembles a well-formed, SEP-0039 compliant `NftMetadata` object from
 * hunt-completion inputs. Does NOT perform validation or upload — use
 * metadataValidator and metadataUploader for those steps.
 */

import type { NftMetadata, NftMetadataBuildInput, NftAttribute } from "./types"
import { extractCID } from "@/lib/ipfs"

/**
 * Normalises any image input (bare CID, ipfs:// URI, or https gateway URL)
 * to a canonical `ipfs://` URI.
 *
 * If the input is already an `ipfs://` URI it is returned unchanged.
 * If it looks like a bare CID it is prefixed with `ipfs://`.
 * Gateway URLs (`/ipfs/<cid>`) are converted via `extractCID`.
 * Any other value is returned as-is (callers should treat this as invalid).
 */
function normaliseImageUri(imageCid: string): string {
  if (imageCid.startsWith("ipfs://")) return imageCid
  const cid = extractCID(imageCid)
  if (cid) return `ipfs://${cid}`
  // Bare CID heuristic (CIDv0 = Qm..., CIDv1 = bafy...)
  if (imageCid.startsWith("Qm") || imageCid.startsWith("bafy")) {
    return `ipfs://${imageCid}`
  }
  return imageCid
}

/**
 * Builds a SEP-0039 compliant `NftMetadata` object from the provided inputs.
 *
 * Hunt-specific attributes included:
 *   - `difficulty`       (trait_type)
 *   - `completion_time`  (trait_type, omitted when `completionTimeSeconds` is undefined)
 *   - `rank`             (trait_type)
 *   - `hunt_name`        (trait_type, only when `huntName` is provided)
 */
export function buildNftMetadata(input: NftMetadataBuildInput): NftMetadata {
  const {
    name,
    description,
    imageCid,
    difficulty,
    completionTimeSeconds,
    rank,
    huntName,
    earnedAt,
    externalUrl,
  } = input

  const attributes: NftAttribute[] = [
    { trait_type: "difficulty", value: difficulty },
    { trait_type: "rank", value: rank },
  ]

  // completion_time is omitted when unavailable (undefined), but included for 0
  if (completionTimeSeconds !== undefined) {
    attributes.splice(1, 0, {
      trait_type: "completion_time",
      value: completionTimeSeconds,
    })
  }

  if (huntName) {
    attributes.push({ trait_type: "hunt_name", value: huntName })
  }

  const metadata: NftMetadata = {
    name,
    description,
    image: normaliseImageUri(imageCid),
    attributes,
  }

  if (earnedAt) metadata.earned_at = earnedAt
  if (externalUrl) metadata.external_url = externalUrl

  return metadata
}
