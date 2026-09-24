/**
 * IPFS utility helpers.
 *
 * Uploads are proxied through /api/ipfs so the Pinata JWT stays server-side.
 * Gateway URLs use public IPFS gateways with an optional configurable primary
 * (set NEXT_PUBLIC_PINATA_GATEWAY to your custom Pinata gateway hostname,
 *  e.g. "mypinata.mypinata.cloud").
 */

const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY
export const COVER_IMAGE_UPLOAD_ERROR_MESSAGE = "Failed to upload cover image. Please try again."

/**
 * Serverless platforms cap request bodies far lower than Pinata accepts
 * (Vercel: ~4.5 MB). Keep client and server in sync so oversized files are
 * rejected with a clear message before the upload starts.
 */
export const MAX_IPFS_UPLOAD_BYTES = Math.floor(4.5 * 1024 * 1024)

export function formatMaxUploadSize(): string {
  return `${(MAX_IPFS_UPLOAD_BYTES / (1024 * 1024)).toFixed(1)} MB`
}

export function isTooLargeForIPFSUpload(file: File | { size: number }): boolean {
  return file.size > MAX_IPFS_UPLOAD_BYTES
}

export function buildFileTooLargeMessage(fileName?: string): string {
  const label = fileName ? `"${fileName}" is` : "This file is"
  return `${label} too large. Maximum upload size is ${formatMaxUploadSize()}.`
}

// Ordered list of public fallback gateways.
const GATEWAYS: string[] = [
  PINATA_GATEWAY ? `https://${PINATA_GATEWAY}` : "https://gateway.pinata.cloud",
  "https://cloudflare-ipfs.com",
  "https://dweb.link",
  "https://ipfs.io",
]

/** Total number of available gateways (used by consumers for fallback cycling). */
export const GATEWAY_COUNT = GATEWAYS.length

/**
 * Returns the IPFS gateway URL for a given CID using the gateway at `index`.
 * Wraps around if index exceeds the available gateway count.
 */
export function getIPFSUrl(cid: string, gatewayIndex = 0): string {
  const gateway = GATEWAYS[gatewayIndex % GATEWAYS.length]
  return `${gateway}/ipfs/${cid}`
}

/**
 * Converts an `ipfs://` URI or bare CID to an HTTP gateway URL.
 * Regular HTTP/HTTPS URLs are returned unchanged (passthrough).
 */
export function resolveImageSrc(src: string, gatewayIndex = 0): string {
  if (src.startsWith("ipfs://")) {
    return getIPFSUrl(src.slice(7), gatewayIndex)
  }
  // Bare CID heuristic: CIDv0 starts with "Qm", CIDv1 starts with "bafy"
  if (src.startsWith("Qm") || src.startsWith("bafy")) {
    return getIPFSUrl(src, gatewayIndex)
  }
  return src
}

/**
 * Extracts the raw CID from an `ipfs://` URI, a gateway URL, or a bare CID.
 * Returns `null` if the string doesn't look like an IPFS reference.
 */
export function extractCID(src: string): string | null {
  if (src.startsWith("ipfs://")) return src.slice(7)
  if (src.startsWith("Qm") || src.startsWith("bafy")) return src
  const match = src.match(/\/ipfs\/([A-Za-z0-9]+)/)
  return match ? match[1] : null
}

/**
 * Uploads a file to IPFS via the server-side `/api/ipfs` proxy.
 * Returns an `ipfs://` URI on success.
 *
 * Throws if:
 * - The API route returns an error (e.g. PINATA_JWT not configured)
 * - The network request fails
 */
export async function uploadToIPFS(file: File, walletAddress?: string): Promise<string> {
  if (isTooLargeForIPFSUpload(file)) {
    throw new Error(buildFileTooLargeMessage(file.name))
  }

  const formData = new FormData()
  formData.append("file", file)

  const headers: Record<string, string> = {}
  if (walletAddress) {
    headers["x-wallet-address"] = walletAddress
  } else {
    headers["x-wallet-address"] = "anonymous"
  }

  const res = await fetch("/api/ipfs", {
    method: "POST",
    headers,
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
    throw new Error(err.error ?? "IPFS upload failed")
  }

  const data = await res.json().catch(() => null) as { cid?: string } | null
  const cid = data?.cid?.trim()
  if (!cid) {
    throw new Error("IPFS upload response did not include a CID")
  }

  return `ipfs://${cid}`
}
