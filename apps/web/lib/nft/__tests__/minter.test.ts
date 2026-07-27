import { Account, rpc, type Transaction } from "@stellar/stellar-sdk"
import { beforeEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({
  publicKey: "",
  getAccount: vi.fn(),
  simulateTransaction: vi.fn(),
  prepareTransaction: vi.fn(),
  sendTransaction: vi.fn(),
  signTransaction: vi.fn(),
}))

vi.mock("@/lib/contracts/config", () => ({
  getRequiredAddress: () => "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
}))
vi.mock("@/lib/huntStore", () => ({ getHunt: () => ({ title: "Typed Hunt" }) }))
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn() } }))
vi.mock("@/lib/nft/metadataBuilder", () => ({
  buildNftMetadata: () => ({ name: "Typed Hunt", description: "Reward", image: "ipfs://image" }),
}))
vi.mock("@/lib/nft/metadataUploader", () => ({
  uploadNftMetadata: () => Promise.resolve({ cid: "metadata-cid", metadataUri: "ipfs://metadata-cid" }),
}))
vi.mock("@/lib/soroban/client", () => ({
  createSorobanServer: () =>
    ({
      getAccount: sdk.getAccount,
      simulateTransaction: sdk.simulateTransaction,
      prepareTransaction: sdk.prepareTransaction,
      sendTransaction: sdk.sendTransaction,
    }) as unknown as rpc.Server,
}))
vi.mock("@/lib/walletAdapter", () => ({
  getActiveWalletAdapter: () => ({
    provider: "freighter",
    getPublicKey: () => Promise.resolve(sdk.publicKey),
    signTransaction: sdk.signTransaction,
  }),
}))

import { estimateMintFee, mintHuntRewardNft } from "../minter"

describe("typed Stellar NFT minting", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sdk.publicKey = "GB2UW33KNO3EGTASKYAJOFPYZJ3RT7C3IG6BOJSKOBXW3PEYNXC5XCCN"
    sdk.getAccount.mockResolvedValue(new Account(sdk.publicKey, "1"))
  })

  it("uses the SDK simulation response to estimate the resource fee", async () => {
    const simulation: rpc.Api.SimulateTransactionSuccessResponse = {
      id: "simulation-1",
      latestLedger: 123,
      events: [],
      _parsed: true,
      transactionData: {} as rpc.Api.SimulateTransactionSuccessResponse["transactionData"],
      minResourceFee: "250000",
    }
    sdk.simulateTransaction.mockResolvedValue(simulation)

    await expect(estimateMintFee(7)).resolves.toEqual({
      feeStroops: 250000,
      feeXlm: 0.025,
      simulated: true,
    })
    expect(sdk.simulateTransaction).toHaveBeenCalledOnce()
  })

  it("prepares, signs, parses, and sends a real SDK transaction", async () => {
    sdk.simulateTransaction.mockResolvedValue({
      id: "simulation-2",
      latestLedger: 124,
      events: [],
      _parsed: true,
      error: "not a contract invocation",
    } satisfies rpc.Api.SimulateTransactionErrorResponse)
    sdk.prepareTransaction.mockImplementation((tx: Transaction) => Promise.resolve(tx))
    sdk.signTransaction.mockImplementation((xdr: string) => Promise.resolve(xdr))
    sdk.sendTransaction.mockResolvedValue({
      status: "PENDING",
      hash: "abc123",
      latestLedger: 125,
      latestLedgerCloseTime: 1,
    } satisfies rpc.Api.SendTransactionResponse)

    const result = await mintHuntRewardNft({ huntId: 7 })

    expect(result.txHash).toBe("abc123")
    expect(sdk.prepareTransaction).toHaveBeenCalledOnce()
    const sent = sdk.sendTransaction.mock.calls[0]?.[0]
    expect(sent).toBeDefined()
    expect(typeof sent.toXDR()).toBe("string")
  })
})

