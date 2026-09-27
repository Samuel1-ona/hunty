/**
 * xBull wallet adapter.
 *
 * xBull is a Stellar wallet available as a browser extension and mobile app.
 * It injects `window.xBullWallet` in the extension context.
 * Docs: https://xbull.app/docs/
 */

import type { ActiveWalletAdapter } from "./types"

type XBullLike = {
  getPublicKey: () => Promise<string>
  signTransaction: (xdr: string, opts?: { network: string }) => Promise<string>
}

function getXBull(): XBullLike {
  if (typeof window === "undefined") throw new Error("Browser environment required")
  const wallet = (window as unknown as { xBullWallet?: XBullLike }).xBullWallet
  if (!wallet) {
    throw new Error(
      "xBull Wallet not found. Please install the xBull extension or open the xBull mobile app."
    )
  }
  return wallet
}

/**
 * Fetch the connected xBull account's public key.
 */
export async function getXBullPublicKey(): Promise<string> {
  return getXBull().getPublicKey()
}

/**
 * Sign a Stellar transaction XDR with xBull.
 * Returns the signed transaction XDR.
 */
export async function signWithXBull(xdr: string): Promise<string> {
  return getXBull().signTransaction(xdr, { network: "TESTNET" })
}

/**
 * Returns an ActiveWalletAdapter backed by xBull.
 */
export function createXBullAdapter(): ActiveWalletAdapter {
  return {
    provider: "xbull",
    getPublicKey: getXBullPublicKey,
    signTransaction: signWithXBull,
  }
}
