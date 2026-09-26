import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "../route"

/**
 * Tests for POST /api/paymaster/sponsor.
 *
 * Auth uses the shared `verifyCallerAuth` helper together with the
 * `x-wallet-signature: valid_test_signature` test bypass in `walletAuth`.
 * The paymaster and the Stellar SDK are mocked so the route logic can be
 * exercised without a funded keypair or a real network.
 */

const { fromXDRMock, sponsorTransactionMock } = vi.hoisted(() => ({
  fromXDRMock: vi.fn(),
  sponsorTransactionMock: vi.fn(),
}))

vi.mock("@/lib/paymaster", () => ({
  getPaymaster: () => ({ sponsorTransaction: sponsorTransactionMock }),
}))

vi.mock("@stellar/stellar-sdk", () => {
  class FeeBumpTransaction {}
  return {
    Networks: { TESTNET: "Test SDF Network ; September 2015" },
    TransactionBuilder: { fromXDR: fromXDRMock },
    FeeBumpTransaction,
    Address: {
      fromScAddress: (scAddress: { id?: string }) => ({
        toString: () => scAddress?.id ?? "CUNKNOWN",
      }),
    },
    Keypair: {
      fromPublicKey: () => ({ verify: () => false }),
    },
  }
})

const walletAddress = "GBRPYHIL2CI3FNQ4BXLFMNDLFPPPU2HY52WSGROMKTCVLA5WDWZTVLTC"
const otherWallet = "GBRPYHIL2CI3FNQ4BXLFMNDLFPPPU2HY52WSGROMKTCVLA5WDWZTVLTD"
const walletSignature = "valid_test_signature"
const walletChallenge = "hunty_paymaster_challenge_123"
const txXdr = "AAAAAgAAAABpaymaster-test-xdr"

function authHeaders(wallet = walletAddress): Record<string, string> {
  return {
    "x-wallet-address": wallet,
    "x-wallet-signature": walletSignature,
    "x-wallet-challenge": walletChallenge,
  }
}

function sponsorRequest(
  headers: Record<string, string> = {},
  wallet = walletAddress
): NextRequest {
  return new NextRequest("http://localhost/api/paymaster/sponsor", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ txXdr, walletAddress: wallet }),
  })
}

describe("POST /api/paymaster/sponsor authentication & authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fromXDRMock.mockReset()
    delete process.env.PAYMASTER_ALLOWED_CONTRACTS
    sponsorTransactionMock.mockResolvedValue({
      sponsored: true,
      feeBumpTxXdr: "fee-bump-xdr",
      remainingTx: 2,
      remainingBudget: 999,
    })
  })

  it("returns 401 for unauthenticated callers (no credentials)", async () => {
    const res = await POST(sponsorRequest())
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toMatch(/Authentication required/i)
  })

  it("returns 403 when the verified actor does not match the requested wallet", async () => {
    const res = await POST(sponsorRequest(authHeaders(otherWallet), walletAddress))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toMatch(/Forbidden/i)
    expect(sponsorTransactionMock).not.toHaveBeenCalled()
  })

  it("returns 200 and sponsors against the verified wallet", async () => {
    const res = await POST(sponsorRequest(authHeaders(walletAddress), walletAddress))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.sponsored).toBe(true)
    expect(sponsorTransactionMock).toHaveBeenCalledWith(txXdr, walletAddress)
  })

  it("returns 403 when the transaction invokes a non-allow-listed contract", async () => {
    process.env.PAYMASTER_ALLOWED_CONTRACTS = "CALLOWEDCONTRACT"
    fromXDRMock.mockReturnValue({
      operations: [
        {
          type: "invokeHostFunction",
          func: {
            invokeContract: () => ({ contractAddress: () => ({ id: "CDISALLOWED" }) }),
          },
        },
      ],
    })

    const res = await POST(sponsorRequest(authHeaders(walletAddress), walletAddress))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toMatch(/allow-list/i)
    expect(sponsorTransactionMock).not.toHaveBeenCalled()
  })

  it("returns 200 when the transaction only invokes allow-listed contracts", async () => {
    process.env.PAYMASTER_ALLOWED_CONTRACTS = "CALLOWEDCONTRACT,COTHER"
    fromXDRMock.mockReturnValue({
      operations: [
        {
          type: "invokeHostFunction",
          func: {
            invokeContract: () => ({ contractAddress: () => ({ id: "CALLOWEDCONTRACT" }) }),
          },
        },
      ],
    })

    const res = await POST(sponsorRequest(authHeaders(walletAddress), walletAddress))
    expect(res.status).toBe(200)
    expect(sponsorTransactionMock).toHaveBeenCalledWith(txXdr, walletAddress)
  })
})
