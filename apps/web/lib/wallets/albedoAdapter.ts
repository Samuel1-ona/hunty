/**
 * Albedo wallet adapter.
 *
 * Albedo is a delegated Stellar signer available as an in-browser popup
 * — no extension install required. It injects `window.albedo`.
 * Docs: https://albedo.link/
 */

import type { ActiveWalletAdapter } from "./types"

type AlbedoLike = {
  publicKey?: (args?: Record<string, unknown>) => Promise<{ pubkey?: string }>
  tx?: (args: { xdr: string; network?: string }) => Promise<{
    xdr?: string
    signed_envelope_xdr?: string
  }>
  signTransaction?: (xdr: string) => Promise<string>
}

function getAlbedo(): AlbedoLike {
  if (typeof window === "undefined") throw new Error("Browser environment required")
  const wallet = (window as unknown as { albedo?: AlbedoLike }).albedo
  if (!wallet) {
    throw new Error(
      "Albedo not found. Open https://albedo.link/ in your browser or ensure the Albedo extension is installed."
    )
  }
  return wallet
}

/**
 * Fetch the public key from Albedo.
 * Albedo may open a popup asking the user to confirm.
 */
export async function getAlbedoPublicKey(): Promise<string> {
  const wallet = getAlbedo()
  if (!wallet.publicKey) {
    throw new Error("Albedo publicKey method not available.")
  }
  const result = await wallet.publicKey({})
  if (!result?.pubkey) throw new Error("Albedo did not return a public key")
  return result.pubkey
}

/**
 * Sign a Stellar transaction XDR via Albedo.
 * Returns the signed transaction XDR.
 */
export async function signWithAlbedo(xdr: string): Promise<string> {
  const wallet = getAlbedo()

  // Prefer a direct signTransaction method if available
  if (wallet.signTransaction) {
    return wallet.signTransaction(xdr)
  }

  if (!wallet.tx) throw new Error("Albedo cannot sign transactions")

  const result = await wallet.tx({ xdr, network: "testnet" })
  const signed = result?.signed_envelope_xdr ?? result?.xdr
  if (!signed) throw new Error("Albedo did not return signed XDR")
  return signed
}

/**
 * Returns an ActiveWalletAdapter backed by Albedo.
 */
export function createAlbedoAdapter(): ActiveWalletAdapter {
  return {
    provider: "albedo",
    getPublicKey: getAlbedoPublicKey,
    signTransaction: signWithAlbedo,
  }
}
