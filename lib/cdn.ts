/**
 * CDN helpers for optimal static asset delivery.
 *
 * - Serves Next.js static assets through NEXT_PUBLIC_CDN_URL when configured.
 * - Proxies IPFS images through images.weserv.nl for on-the-fly resizing and CDN caching.
 * - Provides IPFS gateway selection with round-robin fallback for geographic distribution.
 */

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL ?? "";

// ---------------------------------------------------------------------------
// Next.js custom image loader (used when CDN_URL is set in next.config.ts)
// ---------------------------------------------------------------------------

/**
 * Next.js image loader that routes optimised images through the CDN.
 * When CDN_URL is set, images are served from the CDN edge; otherwise falls back
 * to the default Next.js optimisation endpoint.
 *
 * This file is referenced by `next.config.ts` as `images.loaderFile`.
 */
export default function cdnImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const q = quality ?? 75;

  // Resolve ipfs:// URIs to an HTTP gateway URL before passing to the CDN
  const resolvedSrc = resolveIpfsForCdn(src);

  if (CDN_URL) {
    // Route through CDN – the CDN must be configured to proxy /_next/image
    const params = new URLSearchParams({ url: resolvedSrc, w: String(width), q: String(q) });
    return `${CDN_URL}/_next/image?${params.toString()}`;
  }

  // Default: use weserv.nl as an open image proxy with on-the-fly resizing
  return buildWeservUrl(resolvedSrc, width, q);
}

// ---------------------------------------------------------------------------
// IPFS gateway helpers
// ---------------------------------------------------------------------------

/** Ordered list of public IPFS gateways for geographic distribution. */
const IPFS_GATEWAYS: readonly string[] = [
  process.env.NEXT_PUBLIC_PINATA_GATEWAY
    ? `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}`
    : "https://gateway.pinata.cloud",
  "https://cloudflare-ipfs.com",   // Cloudflare – global PoP network
  "https://dweb.link",             // Protocol Labs
  "https://ipfs.io",               // Protocol Labs fallback
];

/** Total number of IPFS gateways available (useful for fallback cycling). */
export const IPFS_GATEWAY_COUNT = IPFS_GATEWAYS.length;

/**
 * Returns the IPFS HTTP gateway URL for a given CID.
 * `gatewayIndex` wraps around so callers can cycle through gateways on failure.
 */
export function getIpfsGatewayUrl(cid: string, gatewayIndex = 0): string {
  const gateway = IPFS_GATEWAYS[gatewayIndex % IPFS_GATEWAYS.length];
  return `${gateway}/ipfs/${cid}`;
}

/**
 * Resolves an `ipfs://` URI or bare CID to an HTTP gateway URL.
 * Plain HTTP/HTTPS URLs are returned unchanged.
 */
export function resolveIpfsForCdn(src: string, gatewayIndex = 0): string {
  if (src.startsWith("ipfs://")) {
    return getIpfsGatewayUrl(src.slice(7), gatewayIndex);
  }
  if (src.startsWith("Qm") || src.startsWith("bafy")) {
    return getIpfsGatewayUrl(src, gatewayIndex);
  }
  return src;
}

// ---------------------------------------------------------------------------
// Image resizing helpers
// ---------------------------------------------------------------------------

/**
 * Builds a weserv.nl proxy URL for on-the-fly image resizing and CDN caching.
 * weserv caches responses on its own edge network, providing geographic distribution.
 */
export function buildWeservUrl(imageUrl: string, width: number, quality = 75): string {
  const encoded = encodeURIComponent(imageUrl);
  return `https://images.weserv.nl/?url=${encoded}&w=${width}&q=${quality}&output=webp`;
}

/**
 * Returns a CDN-optimised URL for any asset (IPFS or regular).
 * When CDN_URL is configured, static public assets are prefixed with the CDN domain.
 */
export function cdnUrl(path: string): string {
  if (CDN_URL && path.startsWith("/")) {
    return `${CDN_URL}${path}`;
  }
  return path;
}
