/**
 * Shared helpers for presenting a Stellar wallet address in the UI.
 *
 * Before this module the codebase carried five separate copies of "truncate a
 * Stellar address" (Header, LeaderBoardTable, FastestPlayersStrip,
 * CompletedHuntCard, WalletContext), each with a slightly different shape.
 * Everything display-related now routes through here so an address looks the
 * same wherever it appears.
 *
 * Deliberately dependency-free: it is imported by the header, which is on every
 * page, so it must not pull the Stellar SDK into the initial bundle.
 */

/** Canonical Stellar public key: 56 chars, starts with G, base32 alphabet. */
const STELLAR_PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;

/** Passphrase of the public network. Mirrors `MAINNET_NETWORK_PASSPHRASE`. */
const MAINNET_NETWORK_PASSPHRASE = 'Public Global Stellar Network ; September 2015';

/** Passphrase of the test network. Mirrors `TESTNET_CONFIG.networkPassphrase`. */
const TESTNET_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

/** Grid is 5x5 and mirrored down the middle, so 3 columns carry the entropy. */
const IDENTICON_GRID = 5;

export function isStellarAddress(address: string): boolean {
  return STELLAR_PUBLIC_KEY_PATTERN.test(address);
}

export interface TruncateAddressOptions {
  /** Characters kept at the start. Default 4. */
  lead?: number;
  /** Characters kept at the end. Default 4. */
  tail?: number;
  /** Text between the two halves. Default "...". */
  separator?: string;
}

/**
 * Shortens an address to `G12A...XY9Z` form.
 *
 * Returns the input untouched when it is already short enough that truncating
 * would not save space, so short mock addresses in tests stay readable.
 */
export function truncateAddress(
  address: string,
  { lead = 4, tail = 4, separator = '...' }: TruncateAddressOptions = {}
): string {
  if (!address) return '';

  const head = Math.max(0, Math.trunc(lead));
  const foot = Math.max(0, Math.trunc(tail));

  if (address.length <= head + foot + separator.length) return address;

  // slice(-0) returns the whole string, so an empty tail needs its own branch.
  const end = foot === 0 ? '' : address.slice(-foot);
  return `${address.slice(0, head)}${separator}${end}`;
}

/**
 * Which stellar.expert network path an address belongs to.
 *
 * Note this resolves the testnet passphrase to "testnet" rather than the
 * "futurenet" that `getStellarExplorerUrl` in lib/constants.ts uses for every
 * non-mainnet passphrase — an account link has to point at the network the
 * account actually exists on to be useful for verification.
 */
export function getStellarNetworkSlug(): 'public' | 'testnet' | 'futurenet' {
  const passphrase =
    process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE ?? TESTNET_NETWORK_PASSPHRASE;

  if (passphrase === MAINNET_NETWORK_PASSPHRASE) return 'public';
  if (passphrase === TESTNET_NETWORK_PASSPHRASE) return 'testnet';
  return 'futurenet';
}

/** Public stellar.expert page for an account, for verifying an address. */
export function getStellarAccountExplorerUrl(address: string): string {
  return `https://stellar.expert/explorer/${getStellarNetworkSlug()}/account/${encodeURIComponent(address)}`;
}

/**
 * FNV-1a hash. Small, fast, and stable across runs and platforms — the
 * identicon for an address must never change between sessions or devices.
 */
export function hashAddress(address: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < address.length; i++) {
    hash ^= address.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export interface IdenticonSpec {
  /** Row-major grid of filled cells, `size * size` long. */
  cells: boolean[];
  /** Width and height of the grid in cells. */
  size: number;
  foreground: string;
  background: string;
}

/**
 * Derives a deterministic avatar from an address: a horizontally mirrored
 * pixel grid plus a colour pair, both seeded from the address hash. Mirroring
 * is what makes the result read as a face/emblem rather than as noise.
 */
export function getIdenticonSpec(address: string): IdenticonSpec {
  const hash = hashAddress(address ?? '');
  const hue = hash % 360;

  const cells = new Array<boolean>(IDENTICON_GRID * IDENTICON_GRID).fill(false);
  const columns = Math.ceil(IDENTICON_GRID / 2);

  // Re-mix per cell instead of consuming one bit at a time: 32 bits of hash
  // would not cover a larger grid, and re-mixing keeps this size-independent.
  let bits = hash;
  for (let row = 0; row < IDENTICON_GRID; row++) {
    for (let column = 0; column < columns; column++) {
      bits = (Math.imul(bits, 0x01000193) ^ (row * 31 + column)) >>> 0;
      const filled = ((bits >>> 8) & 1) === 1;

      cells[row * IDENTICON_GRID + column] = filled;
      cells[row * IDENTICON_GRID + (IDENTICON_GRID - 1 - column)] = filled;
    }
  }

  return {
    cells,
    size: IDENTICON_GRID,
    foreground: `hsl(${hue} 68% 46%)`,
    background: `hsl(${(hue + 42) % 360} 62% 92%)`,
  };
}
