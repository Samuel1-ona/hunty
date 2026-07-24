import { getAddress, signTransaction as freighterSignTransaction } from "@stellar/freighter-api"

export type WalletProvider = "freighter" | "albedo" | "rabet" | "xbull" | "lobstr"

const WALLET_SESSION_KEY = "stellar_wallet_session"

type WalletSession = {
  provider: WalletProvider
  publicKey: string
}

type WalletConnectResult = {
  publicKey?: string
  address?: string
}

type RabetLike = {
  connect?: () => Promise<WalletConnectResult>
  getAddress?: () => Promise<string>
  getPublicKey?: () => Promise<string>
  sign?: (xdr: string) => Promise<string>
  signTransaction?: (xdr: string) => Promise<string>
}

type AlbedoLike = {
  publicKey?: (args?: Record<string, unknown>) => Promise<{ pubkey?: string }>
  tx?: (args: { xdr: string; network?: string }) => Promise<{ xdr?: string; signed_envelope_xdr?: string }>
  signTransaction?: (xdr: string) => Promise<string>
}

type XBullLike = {
  getPublicKey: () => Promise<string>
  signTransaction: (xdr: string, opts?: { network: string }) => Promise<string>
}

type BrowserWithWallets = Window & {
  freighter?: unknown
  rabet?: unknown
  albedo?: unknown
  soroban?: unknown
  sorobanWallet?: unknown
  xBullWallet?: XBullLike
}

export type ActiveWalletAdapter = {
  provider: WalletProvider
  getPublicKey: () => Promise<string>
  signTransaction: (xdr: string) => Promise<string>
}

function parseSession(value: string | null): WalletSession | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as WalletSession
    if (
      parsed &&
      (parsed.provider === "freighter" ||
        parsed.provider === "albedo" ||
        parsed.provider === "rabet" ||
        parsed.provider === "xbull" ||
        parsed.provider === "lobstr") &&
      typeof parsed.publicKey === "string"
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function getStoredWalletSession(): WalletSession | null {
  if (typeof window === "undefined") return null
  const value = localStorage.getItem(WALLET_SESSION_KEY)
  return parseSession(value)
}

export function setStoredWalletSession(provider: WalletProvider, publicKey: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(WALLET_SESSION_KEY, JSON.stringify({ provider, publicKey }))
}

export function clearStoredWalletSession(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(WALLET_SESSION_KEY)
}

async function getFreighterPublicKey(): Promise<string> {
  const { address, error } = await getAddress()
  if (error) throw new Error(error)
  if (!address) throw new Error("Freighter wallet not available")
  return address
}

async function signWithFreighter(xdr: string): Promise<string> {
  const signedXdr = await freighterSignTransaction(xdr)
  if (signedXdr.error) throw new Error(String(signedXdr.error))
  if (!signedXdr.signedTxXdr) throw new Error("Freighter cannot sign transaction")
  return signedXdr.signedTxXdr
}

async function getRabetPublicKey(win: BrowserWithWallets): Promise<string> {
  const wallet = win.rabet as RabetLike | undefined
  if (!wallet) throw new Error("Rabet wallet not found. Install Rabet extension.")
  if (wallet.connect) {
    const response = await wallet.connect()
    const value = response?.publicKey ?? response?.address
    if (value) return value
  }
  if (wallet.getPublicKey) return wallet.getPublicKey()
  if (wallet.getAddress) return wallet.getAddress()
  throw new Error("Unable to read address from Rabet wallet")
}

async function signWithRabet(win: BrowserWithWallets, xdr: string): Promise<string> {
  const wallet = win.rabet as RabetLike | undefined
  if (!wallet) throw new Error("Rabet wallet not found. Install Rabet extension.")
  if (wallet.signTransaction) return wallet.signTransaction(xdr)
  if (wallet.sign) return wallet.sign(xdr)
  throw new Error("Rabet cannot sign transaction")
}

async function getAlbedoPublicKey(win: BrowserWithWallets): Promise<string> {
  const wallet = win.albedo as AlbedoLike | undefined
  if (!wallet?.publicKey) {
    throw new Error("Albedo not found. Install Albedo or open in an Albedo-enabled browser.")
  }
  const result = await wallet.publicKey({})
  if (!result?.pubkey) throw new Error("Albedo did not return a public key")
  return result.pubkey
}

async function signWithAlbedo(win: BrowserWithWallets, xdr: string): Promise<string> {
  const wallet = win.albedo as AlbedoLike | undefined
  if (!wallet) throw new Error("Albedo not found.")
  if (wallet.signTransaction) return wallet.signTransaction(xdr)
  if (!wallet.tx) throw new Error("Albedo cannot sign transaction")
  const result = await wallet.tx({ xdr, network: "testnet" })
  const signed = result?.signed_envelope_xdr ?? result?.xdr
  if (!signed) throw new Error("Albedo did not return signed XDR")
  return signed
}

async function getXBullPublicKey(win: BrowserWithWallets): Promise<string> {
  const wallet = win.xBullWallet
  if (!wallet) throw new Error("xBull Wallet not found. Please install the extension or app.")
  return wallet.getPublicKey()
}

async function signWithXBull(win: BrowserWithWallets, xdr: string): Promise<string> {
  const wallet = win.xBullWallet
  if (!wallet) throw new Error("xBull Wallet not found.")
  return wallet.signTransaction(xdr, { network: "TESTNET" })
}

export async function connectWalletProvider(provider: WalletProvider): Promise<string> {
  if (typeof window === "undefined") throw new Error("Browser environment required")
  const win = window as BrowserWithWallets
  if (provider === "freighter") return getFreighterPublicKey()
  if (provider === "rabet") return getRabetPublicKey(win)
  if (provider === "xbull") return getXBullPublicKey(win)
  if (provider === "lobstr") {
    // For Lobstr on mobile, we often just redirect or usage with deep links.
    // For now, we'll suggest a placeholder or use a generic approach if possible.
    throw new Error("Lobstr integration via this adapter is currently mobile-only.")
  }
  return getAlbedoPublicKey(win)
}

export function getActiveWalletAdapter(): ActiveWalletAdapter {
  if (typeof window === "undefined") throw new Error("Browser environment required")
  const win = window as BrowserWithWallets
  const provider = getStoredWalletSession()?.provider ?? "freighter"

  if (provider === "rabet") {
    return {
      provider,
      getPublicKey: () => getRabetPublicKey(win),
      signTransaction: (xdr) => signWithRabet(win, xdr),
    }
  }

  if (provider === "albedo") {
    return {
      provider,
      getPublicKey: () => getAlbedoPublicKey(win),
      signTransaction: (xdr) => signWithAlbedo(win, xdr),
    }
  }

  if (provider === "xbull") {
    return {
      provider,
      getPublicKey: () => getXBullPublicKey(win),
      signTransaction: (xdr) => signWithXBull(win, xdr),
    }
  }

  return {
    provider: "freighter",
    getPublicKey: () => getFreighterPublicKey(),
    signTransaction: (xdr) => signWithFreighter(xdr),
  }
}
