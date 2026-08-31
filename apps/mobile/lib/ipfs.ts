/**
 * IPFS gateway helpers for mobile image loading.
 */

const GATEWAYS: string[] = [
  'https://gateway.pinata.cloud',
  'https://cloudflare-ipfs.com',
  'https://dweb.link',
  'https://ipfs.io',
];

export const GATEWAY_COUNT = GATEWAYS.length;

export function getIPFSUrl(cid: string, gatewayIndex = 0): string {
  const gateway = GATEWAYS[gatewayIndex % GATEWAYS.length];
  return `${gateway}/ipfs/${cid}`;
}

export function resolveImageSrc(src: string, gatewayIndex = 0): string {
  if (src.startsWith('ipfs://')) {
    return getIPFSUrl(src.slice(7), gatewayIndex);
  }
  if (src.startsWith('Qm') || src.startsWith('bafy')) {
    return getIPFSUrl(src, gatewayIndex);
  }
  return src;
}
