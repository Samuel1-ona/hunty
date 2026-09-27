/**
 * NFT metadata uploader.
 *
 * Validates a `NftMetadata` object, serialises it to JSON, and uploads it to
 * IPFS via the `/api/ipfs` server-side proxy.  Returns an `ipfs://` URI.
 *
 * This module is browser-only; it relies on the `fetch` API and the
 * `/api/ipfs` route (which requires an active Next.js server).
 */

import { validateNftMetadata } from "./metadataValidator"
import { MetadataValidationError, IpfsUploadError } from "./errors"
import { logger } from "@/lib/logger"
import type { NftMetadata, MetadataUploadResult } from "./types"

/** Warn when serialised metadata exceeds this threshold (100 KB). */
const UPLOAD_WARN_BYTES = 100 * 1024

/**
 * Uploads a validated `NftMetadata` object to IPFS.
 *
 * Steps:
 *  1. Validate against SEP-0039 schema — throws `MetadataValidationError` on failure.
 *  2. Serialise to canonical (sorted-key, deterministic) JSON.
 *  3. Log a warning if the payload exceeds 100 KB.
 *  4. POST the JSON blob to `/api/ipfs` with Content-Type `application/json`.
 *  5. Return the resulting `ipfs://` URI and raw CID.
 *
 * @param metadata - The NFT metadata object to upload.
 * @param walletAddress - The player's wallet address, forwarded in the
 *   `x-wallet-address` header required by the `/api/ipfs` proxy.
 * @throws {MetadataValidationError} if the metadata fails schema validation.
 * @throws {IpfsUploadError} if the IPFS proxy returns a non-2xx response.
 */
export async function uploadNftMetadata(
  metadata: NftMetadata,
  walletAddress: string
): Promise<MetadataUploadResult> {
  // Step 1: Validate
  const result = validateNftMetadata(metadata)
  if (!result.valid) {
    logger.error("NFT metadata validation failed before upload:", result.errors)
    throw new MetadataValidationError(result.errors)
  }

  // Step 2: Serialise deterministically (sorted keys for stable CIDs)
  const json = deterministicJson(metadata)
  const encoded = new TextEncoder().encode(json)

  // Step 3: Warn on large payloads
  if (encoded.byteLength > UPLOAD_WARN_BYTES) {
    logger.warn(
      `NFT metadata payload is large (${encoded.byteLength} bytes). Consider reducing attribute count or description length.`
    )
  }

  // Step 4: Build a File blob and POST to the IPFS proxy
  const file = new File([encoded], "metadata.json", { type: "application/json" })
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch("/api/ipfs", {
    method: "POST",
    headers: {
      "x-wallet-address": walletAddress,
    },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText)
    logger.error(`IPFS metadata upload failed — HTTP ${res.status}:`, body)
    throw new IpfsUploadError(res.status, body)
  }

  const data = (await res.json().catch(() => null)) as { cid?: string } | null
  const cid = data?.cid?.trim()
  if (!cid) {
    throw new IpfsUploadError(200, "IPFS proxy response did not include a CID")
  }

  // Step 5: Return URI + CID
  return {
    metadataUri: `ipfs://${cid}`,
    cid,
  }
}

/**
 * Serialises an object to JSON with keys sorted alphabetically at every level.
 * This produces a deterministic byte sequence so that uploading the same
 * metadata twice yields the same CID.
 */
function deterministicJson(value: unknown): string {
  return JSON.stringify(sortKeys(value), null, 0)
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys)
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as object).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  return value
}
