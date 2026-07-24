import { describe, it, expect } from 'vitest';

// Mirror mobile/lib/ipfs.ts for unit testing without RN deps
const GATEWAYS = [
  'https://gateway.pinata.cloud',
  'https://cloudflare-ipfs.com',
  'https://dweb.link',
  'https://ipfs.io',
];

function getIPFSUrl(cid: string, gatewayIndex = 0): string {
  const gateway = GATEWAYS[gatewayIndex % GATEWAYS.length];
  return `${gateway}/ipfs/${cid}`;
}

function resolveImageSrc(src: string, gatewayIndex = 0): string {
  if (src.startsWith('ipfs://')) {
    return getIPFSUrl(src.slice(7), gatewayIndex);
  }
  if (src.startsWith('Qm') || src.startsWith('bafy')) {
    return getIPFSUrl(src, gatewayIndex);
  }
  return src;
}

describe('mobile IPFS image resolution', () => {
  it('resolves ipfs:// URIs to gateway URLs', () => {
    expect(resolveImageSrc('ipfs://bafytest')).toBe(
      'https://gateway.pinata.cloud/ipfs/bafytest'
    );
  });

  it('resolves bare CIDs', () => {
    expect(resolveImageSrc('QmTest123')).toContain('/ipfs/QmTest123');
  });

  it('passes through https URLs unchanged', () => {
    const url = 'https://example.com/image.png';
    expect(resolveImageSrc(url)).toBe(url);
  });

  it('cycles gateways on fallback index', () => {
    expect(resolveImageSrc('ipfs://cid', 1)).toBe(
      'https://cloudflare-ipfs.com/ipfs/cid'
    );
  });
});
