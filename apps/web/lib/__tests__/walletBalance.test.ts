import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  BALANCE_REQUEST_TIMEOUT_MS,
  describeWalletBalanceError,
  fetchWalletBalance,
  formatXlmAmount,
  getHorizonUrl,
  isStellarPublicKey,
  MAINNET_HORIZON_URL,
  TESTNET_HORIZON_URL,
  WalletBalanceError,
} from "@/lib/wallet/balance"

const ADDRESS = "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37"
const HORIZON = "https://horizon.test"

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return {
    ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
    status: init.status ?? 200,
    json: async () => body,
  } as Response
}

function accountPayload(nativeBalance: string) {
  return {
    balances: [
      { asset_type: "credit_alphanum4", asset_code: "USDC", balance: "10.0000000" },
      { asset_type: "native", balance: nativeBalance },
    ],
  }
}

describe("isStellarPublicKey", () => {
  it("accepts a well-formed public key", () => {
    expect(isStellarPublicKey(ADDRESS)).toBe(true)
  })

  it.each([
    ["empty string", ""],
    ["secret key", "SDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37"],
    ["too short", "GDQP2KPQ"],
    ["lowercase", ADDRESS.toLowerCase()],
    ["contains 0/1 (not in base32 alphabet)", "G01P2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37"],
  ])("rejects %s", (_label, value) => {
    expect(isStellarPublicKey(value)).toBe(false)
  })

  it("rejects null and undefined", () => {
    expect(isStellarPublicKey(null)).toBe(false)
    expect(isStellarPublicKey(undefined)).toBe(false)
  })
})

describe("getHorizonUrl", () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("defaults to testnet", () => {
    delete process.env.NEXT_PUBLIC_HORIZON_URL
    delete process.env.NEXT_PUBLIC_SOROBAN_NETWORK_TYPE
    expect(getHorizonUrl()).toBe(TESTNET_HORIZON_URL)
  })

  it("uses mainnet Horizon when the network type is mainnet", () => {
    delete process.env.NEXT_PUBLIC_HORIZON_URL
    process.env.NEXT_PUBLIC_SOROBAN_NETWORK_TYPE = "mainnet"
    expect(getHorizonUrl()).toBe(MAINNET_HORIZON_URL)
  })

  it("prefers an explicit override and strips trailing slashes", () => {
    process.env.NEXT_PUBLIC_SOROBAN_NETWORK_TYPE = "mainnet"
    process.env.NEXT_PUBLIC_HORIZON_URL = "https://my-horizon.example.com//"
    expect(getHorizonUrl()).toBe("https://my-horizon.example.com")
  })
})

describe("fetchWalletBalance", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns the native balance", async () => {
    fetchMock.mockResolvedValue(jsonResponse(accountPayload("24.2453000")))

    const snapshot = await fetchWalletBalance(ADDRESS, { horizonUrl: HORIZON })

    expect(snapshot.xlm).toBe(24.2453)
    expect(snapshot.address).toBe(ADDRESS)
    expect(snapshot.unfunded).toBe(false)
    expect(snapshot.optimistic).toBe(false)
    expect(snapshot.fetchedAt).toBeGreaterThan(0)
    expect(snapshot.tokens).toEqual([
      { assetCode: "USDC", assetIssuer: "", balance: 10 },
    ])
  })

  it("requests the account endpoint on the configured Horizon", async () => {
    fetchMock.mockResolvedValue(jsonResponse(accountPayload("1.0000000")))

    await fetchWalletBalance(ADDRESS, { horizonUrl: `${HORIZON}/` })

    expect(fetchMock).toHaveBeenCalledWith(
      `${HORIZON}/accounts/${ADDRESS}`,
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    )
  })

  it("treats an unfunded account (404) as a zero balance, not an error", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 404 }, { status: 404 }))

    const snapshot = await fetchWalletBalance(ADDRESS, { horizonUrl: HORIZON })

    expect(snapshot.xlm).toBe(0)
    expect(snapshot.tokens).toEqual([])
    expect(snapshot.unfunded).toBe(true)
  })

  it("returns non-native token balances alongside XLM", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        balances: [
          {
            asset_type: "credit_alphanum4",
            asset_code: "USDC",
            asset_issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
            balance: "10.0000000",
          },
          {
            asset_type: "credit_alphanum12",
            asset_code: "HUNTYPOINTS",
            asset_issuer: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
            balance: "250.0000000",
          },
          { asset_type: "native", balance: "24.2453000" },
        ],
      }),
    )

    const snapshot = await fetchWalletBalance(ADDRESS, { horizonUrl: HORIZON })

    expect(snapshot.xlm).toBe(24.2453)
    // Richest first, so the most meaningful holding leads.
    expect(snapshot.tokens).toEqual([
      {
        assetCode: "HUNTYPOINTS",
        assetIssuer: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
        balance: 250,
      },
      {
        assetCode: "USDC",
        assetIssuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
        balance: 10,
      },
    ])
  })

  it("skips liquidity pool shares, which have no asset code", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        balances: [
          { asset_type: "liquidity_pool_shares", liquidity_pool_id: "abc123", balance: "5.0" },
          { asset_type: "native", balance: "1.0000000" },
        ],
      }),
    )

    const snapshot = await fetchWalletBalance(ADDRESS, { horizonUrl: HORIZON })

    expect(snapshot.tokens).toEqual([])
    expect(snapshot.xlm).toBe(1)
  })

  it("drops an unreadable token rather than losing the whole balance", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        balances: [
          { asset_type: "credit_alphanum4", asset_code: "BAD", balance: "not-a-number" },
          {
            asset_type: "credit_alphanum4",
            asset_code: "OK",
            asset_issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
            balance: "3.0000000",
          },
          { asset_type: "native", balance: "9.0000000" },
        ],
      }),
    )

    const snapshot = await fetchWalletBalance(ADDRESS, { horizonUrl: HORIZON })

    expect(snapshot.xlm).toBe(9)
    expect(snapshot.tokens).toHaveLength(1)
    expect(snapshot.tokens[0].assetCode).toBe("OK")
  })

  it("rejects an invalid address without calling the network", async () => {
    await expect(fetchWalletBalance("not-a-key", { horizonUrl: HORIZON })).rejects.toMatchObject({
      kind: "invalid-address",
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("flags rate limiting distinctly from other HTTP failures", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 429 }))

    await expect(fetchWalletBalance(ADDRESS, { horizonUrl: HORIZON })).rejects.toMatchObject({
      kind: "rate-limited",
      status: 429,
    })
  })

  it("surfaces server errors as http failures", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 503 }))

    await expect(fetchWalletBalance(ADDRESS, { horizonUrl: HORIZON })).rejects.toMatchObject({
      kind: "http",
      status: 503,
    })
  })

  it("reports a network failure when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))

    await expect(fetchWalletBalance(ADDRESS, { horizonUrl: HORIZON })).rejects.toMatchObject({
      kind: "network",
    })
  })

  it("reports a parse failure when the body is not JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token")
      },
    } as unknown as Response)

    await expect(fetchWalletBalance(ADDRESS, { horizonUrl: HORIZON })).rejects.toMatchObject({
      kind: "parse",
    })
  })

  it("reports a parse failure when no native balance is present", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ balances: [{ asset_type: "credit_alphanum4", balance: "5" }] }),
    )

    await expect(fetchWalletBalance(ADDRESS, { horizonUrl: HORIZON })).rejects.toMatchObject({
      kind: "parse",
    })
  })

  it("reports a parse failure when the amount is not a number", async () => {
    fetchMock.mockResolvedValue(jsonResponse(accountPayload("not-a-number")))

    await expect(fetchWalletBalance(ADDRESS, { horizonUrl: HORIZON })).rejects.toMatchObject({
      kind: "parse",
    })
  })

  it("times out a request that never answers", async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")))
        }),
    )

    await expect(
      fetchWalletBalance(ADDRESS, { horizonUrl: HORIZON, timeoutMs: 10 }),
    ).rejects.toMatchObject({ kind: "timeout" })
  })

  it("re-throws a caller-initiated abort untouched so react-query sees a cancellation", async () => {
    const controller = new AbortController()
    const abortError = new Error("The operation was aborted")
    controller.abort()
    fetchMock.mockRejectedValue(abortError)

    await expect(
      fetchWalletBalance(ADDRESS, { horizonUrl: HORIZON, signal: controller.signal }),
    ).rejects.toBe(abortError)
  })

  it("defaults to a timeout below the 30s poll interval", () => {
    expect(BALANCE_REQUEST_TIMEOUT_MS).toBeLessThan(30_000)
  })
})

describe("formatXlmAmount", () => {
  it("renders an em dash for an unknown balance", () => {
    expect(formatXlmAmount(null)).toBe("—")
    expect(formatXlmAmount(undefined)).toBe("—")
    expect(formatXlmAmount(Number.NaN)).toBe("—")
  })

  it("keeps at least two and at most four decimals", () => {
    expect(formatXlmAmount(24.2453)).toBe("24.2453")
    expect(formatXlmAmount(5)).toBe("5.00")
    expect(formatXlmAmount(1.234567)).toBe("1.2346")
  })

  it("groups thousands", () => {
    expect(formatXlmAmount(1234567.5)).toBe("1,234,567.50")
  })

  it("renders a zero balance rather than an em dash", () => {
    expect(formatXlmAmount(0)).toBe("0.00")
  })
})

describe("describeWalletBalanceError", () => {
  it.each([
    ["invalid-address", /valid/i],
    ["timeout", /too long/i],
    ["rate-limited", /too many requests/i],
    ["network", /can't reach/i],
    ["http", /unexpected response/i],
    ["parse", /unreadable/i],
  ] as const)("returns readable copy for %s", (kind, pattern) => {
    const message = describeWalletBalanceError(new WalletBalanceError(kind, "raw internal detail"))
    expect(message).toMatch(pattern)
    expect(message).not.toContain("raw internal detail")
  })

  it("falls back for unknown errors", () => {
    expect(describeWalletBalanceError(new Error("boom"))).toMatch(/couldn't refresh/i)
    expect(describeWalletBalanceError("nope")).toMatch(/couldn't refresh/i)
  })
})
