/**
 * Shared upload limits for the IPFS proxy.
 *
 * `/api/ipfs` runs inside a serverless function, so an upload is bounded by the
 * hosting platform's request-body limit (4.5 MB on Vercel) — not by Pinata.
 * Keeping the limit in one place lets the server reject oversized requests with
 * a clear validation message and lets the client fail fast, before the bytes
 * ever leave the browser.
 */

/** Maximum size of a single IPFS upload, matching the Vercel serverless body limit. */
export const MAX_IPFS_UPLOAD_BYTES = 4.5 * 1024 * 1024

/** Human-readable limit, e.g. `4.5 MB`. */
export const MAX_IPFS_UPLOAD_LABEL = "4.5 MB"

/** Message shown whenever an upload exceeds {@link MAX_IPFS_UPLOAD_BYTES}. */
export const IPFS_UPLOAD_TOO_LARGE_MESSAGE = `File is too large. The maximum upload size is ${MAX_IPFS_UPLOAD_LABEL}.`

/** Returns `true` when `bytes` is larger than the allowed IPFS upload size. */
export function exceedsUploadLimit(bytes: number): boolean {
  return bytes > MAX_IPFS_UPLOAD_BYTES
}
