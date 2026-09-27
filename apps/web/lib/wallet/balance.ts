/**
 * Live XLM balance lookups against Stellar Horizon.
 *
 * Horizon's REST API is called directly rather than through the stellar-sdk
 * `Server` class: the only endpoint needed is `GET /accounts/{address}`, and
 * going over plain `fetch` keeps this module free of SDK imports (which would
 * otherwise be pulled into the header bundle) and trivial to mock in tests.
 */

export const TESTNET_HORIZON_URL = "https://horizon-testnet.stellar.org"
export const MAINNET_HORIZON_URL = "https://horizon.stellar.org"

/**
 * Horizon is aggressively rate limited and the balance is re-polled every 30s,
 * so a request that has not answered well before the next tick is abandoned
 * rather than left to pile up.
 */
export const BALANCE_REQUEST_TIMEOUT_MS = 10_000

/** Stellar public keys are base32 (RFC 4648 alphabet), 56 chars, `G` prefixed. */
const STELLAR_PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/

export type WalletBalanceErrorKind =
  | "invalid-address"
  | "network"
  | "timeout"
  | "rate-limited"
  | "http"
  | "parse"

/**
 * Error type for every failure path in this module. `kind` lets callers decide
 * whether retrying is worthwhile (`network`/`timeout`/`rate-limited`) or
 * pointless (`invalid-address`/`parse`).
 */
export class WalletBalanceError extends Error {
  readonly kind: WalletBalanceErrorKind
  readonly status?: number

  constructor(kind: WalletBalanceErrorKind, message: string, status?: number) {
    super(message)
    this.name = "WalletBalanceError"
    this.kind = kind
    this.status = status
  }
}

/** A non-native asset held by the account (USDC, a hunt reward token, …). */
export type TokenBalance = {
  /** Asset code as issued, e.g. `USDC`. */
  assetCode: string
  /** Issuing account's public key. Two assets can share a code but never an issuer. */
  assetIssuer: string
  balance: number
}

export type WalletBalanceSnapshot = {
  address: string
  /** Native (XLM) balance. `0` for an account Horizon has never seen. */
  xlm: number
  /**
   * Non-native asset balances, richest first. Horizon returns these in the
   * same `/accounts` payload as the native balance, so they cost no extra
   * request.
   */
  tokens: TokenBalance[]
  /** True when Horizon returns 404 — the account exists locally but is unfunded. */
  unfunded: boolean
  /** Epoch millis at which this snapshot was produced. */
  fetchedAt: number
  /**
   * True while the value is a local prediction (see `applyOptimisticDelta`)
   * that has not yet been confirmed by a Horizon read.
   */
  optimistic: boolean
}

export type NftCountSnapshot = {
  address: string
  count: number
  fetchedAt: number
  optimistic: boolean
}

/** Narrow shape of the Horizon `/accounts/{id}` payload that this module reads. */
type HorizonAccountResponse = {
  balances?: Array<{
    asset_type?: string
    asset_code?: string
    asset_issuer?: string
    balance?: string
  }>
}

/**
 * Extracts non-native holdings from a Horizon balances array.
 *
 * Liquidity pool shares also appear here but carry no asset code — they are
 * not a token the user holds in any displayable sense, so they are skipped
 * along with any entry whose amount will not parse.
 */
function parseTokenBalances(
  balances: NonNullable<HorizonAccountResponse["balances"]>,
): TokenBalance[] {
  return balances
    .filter((entry) => entry.asset_type !== "native" && Boolean(entry.asset_code))
    .map((entry) => ({
      assetCode: entry.asset_code as string,
      assetIssuer: entry.asset_issuer ?? "",
      balance: Number(entry.balance),
    }))
    .filter((token) => Number.isFinite(token.balance) && token.balance >= 0)
    .sort((a, b) => b.balance - a.balance || a.assetCode.localeCompare(b.assetCode))
}

export function isStellarPublicKey(address: string | null | undefined): boolean {
  return typeof address === "string" && STELLAR_PUBLIC_KEY_PATTERN.test(address)
}

/**
 * Resolves the Horizon base URL. An explicit `NEXT_PUBLIC_HORIZON_URL` always
 * wins; otherwise the network is inferred from the same
 * `NEXT_PUBLIC_SOROBAN_NETWORK_TYPE` switch the rest of the app reads, so the
 * balance never comes from a different network than the contracts.
 */
export function getHorizonUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_HORIZON_URL
  if (explicit) return explicit.replace(/\/+$/, "")
  return process.env.NEXT_PUBLIC_SOROBAN_NETWORK_TYPE === "mainnet"
    ? MAINNET_HORIZON_URL
    : TESTNET_HORIZON_URL
}

/**
 * Derives an `AbortSignal` that fires when either the caller's signal aborts or
 * `timeoutMs` elapses. `AbortSignal.any`/`AbortSignal.timeout` are deliberately
 * avoided so the timeout can be distinguished from a caller-initiated abort,
 * which is what lets a hung request surface as `timeout` rather than `network`.
 */
function createRequestSignal(
  callerSignal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; timedOut: () => boolean; cleanup: () => void } {
  const controller = new AbortController()
  let didTimeOut = false

  const timer = setTimeout(() => {
    didTimeOut = true
    controller.abort()
  }, timeoutMs)

  const forwardAbort = () => controller.abort()
  if (callerSignal) {
    if (callerSignal.aborted) forwardAbort()
    else callerSignal.addEventListener("abort", forwardAbort, { once: true })
  }

  return {
    signal: controller.signal,
    timedOut: () => didTimeOut,
    cleanup: () => {
      clearTimeout(timer)
      callerSignal?.removeEventListener("abort", forwardAbort)
    },
  }
}

/**
 * Reads the native XLM balance and every non-native token balance for
 * `address` from Horizon, in a single request.
 *
 * An unfunded account (Horizon 404) is **not** an error: Stellar accounts do
 * not exist on-chain until they receive their first payment, and a brand new
 * wallet should read `0 XLM`, not "failed to load". Every other failure throws
 * a {@link WalletBalanceError} so the caller can distinguish transient network
 * trouble (worth retrying, keep showing the last known value) from a permanent
 * problem such as a malformed address.
 */
export async function fetchWalletBalance(
  address: string,
  options: {
    signal?: AbortSignal
    horizonUrl?: string
    timeoutMs?: number
  } = {},
): Promise<WalletBalanceSnapshot> {
  if (!isStellarPublicKey(address)) {
    throw new WalletBalanceError("invalid-address", "Not a valid Stellar public key.")
  }

  const baseUrl = (options.horizonUrl ?? getHorizonUrl()).replace(/\/+$/, "")
  const timeoutMs = options.timeoutMs ?? BALANCE_REQUEST_TIMEOUT_MS
  const request = createRequestSignal(options.signal, timeoutMs)

  let response: Response
  try {
    response = await fetch(`${baseUrl}/accounts/${encodeURIComponent(address)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: request.signal,
    })
  } catch (error) {
    if (request.timedOut()) {
      throw new WalletBalanceError("timeout", "Horizon request timed out.")
    }
    // A caller-initiated abort (component unmounted, query superseded) is
    // re-thrown untouched so react-query treats it as a cancellation.
    if (options.signal?.aborted) throw error
    throw new WalletBalanceError(
      "network",
      error instanceof Error ? error.message : "Could not reach Horizon.",
    )
  } finally {
    request.cleanup()
  }

  // Horizon has no record of the account — it has never been funded.
  if (response.status === 404) {
    return {
      address,
      xlm: 0,
      tokens: [],
      unfunded: true,
      fetchedAt: Date.now(),
      optimistic: false,
    }
  }

  if (response.status === 429) {
    throw new WalletBalanceError("rate-limited", "Horizon rate limit reached.", 429)
  }

  if (!response.ok) {
    throw new WalletBalanceError(
      "http",
      `Horizon responded with ${response.status}.`,
      response.status,
    )
  }

  let payload: HorizonAccountResponse
  try {
    payload = (await response.json()) as HorizonAccountResponse
  } catch {
    throw new WalletBalanceError("parse", "Horizon returned a malformed response.")
  }

  const balances = payload?.balances
  const native = balances?.find((entry) => entry.asset_type === "native")
  if (!balances || !native) {
    throw new WalletBalanceError("parse", "Horizon response contained no native balance.")
  }

  const xlm = Number(native.balance)
  if (!Number.isFinite(xlm) || xlm < 0) {
    throw new WalletBalanceError("parse", "Horizon returned an unreadable balance amount.")
  }

  return {
    address,
    xlm,
    // A single unreadable token must not cost the user their XLM balance, so
    // token parsing drops bad entries rather than throwing.
    tokens: parseTokenBalances(balances),
    unfunded: false,
    fetchedAt: Date.now(),
    optimistic: false,
  }
}

/**
 * Formats an XLM amount for display. `null`/`undefined` render as an em dash so
 * a not-yet-loaded balance never shows a misleading `0`.
 */
export function formatXlmAmount(
  amount: number | null | undefined,
  options: { maximumFractionDigits?: number } = {},
): string {
  if (amount == null || !Number.isFinite(amount)) return "—"
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 4,
  }).format(amount)
}

/**
 * Maps a thrown error onto copy safe to show a user. Raw Horizon/fetch messages
 * are never surfaced directly — they leak URLs and mean nothing to a player.
 */
export function describeWalletBalanceError(error: unknown): string {
  if (error instanceof WalletBalanceError) {
    switch (error.kind) {
      case "invalid-address":
        return "That wallet address doesn't look valid."
      case "timeout":
        return "The network took too long to respond."
      case "rate-limited":
        return "Too many requests — retrying shortly."
      case "network":
        return "Can't reach the Stellar network."
      case "http":
        return "The network returned an unexpected response."
      case "parse":
        return "Received an unreadable response from the network."
    }
  }
  return "Couldn't refresh your balance."
}
