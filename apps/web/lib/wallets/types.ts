/**
 * Wallet adapter types shared across all provider implementations.
 */

export type WalletProvider = "freighter" | "albedo" | "rabet" | "xbull" | "lobstr"

/**
 * Unified interface every wallet adapter must satisfy.
 * Consumers call getPublicKey() to fetch the account address and
 * signTransaction(xdr) to sign a Stellar transaction envelope.
 */
export type ActiveWalletAdapter = {
  provider: WalletProvider
  getPublicKey: () => Promise<string>
  signTransaction: (xdr: string) => Promise<string>
}
