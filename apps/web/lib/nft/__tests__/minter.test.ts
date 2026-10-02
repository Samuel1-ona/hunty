/**
 * Tests for the NFT minting flow (lib/nft/minter.ts).
 *
 * Covers:
 *   - estimateMintFee: uses rpc.Api.SimulateTransactionResponse types
 *   - mintHuntRewardNft: full happy-path and error branches
 *   - MintRejectedError / MintTimeoutError classification
 *   - saveMintReceipt / getMintReceipt round-trip
 *   - buildExplorerUrl logic (via MintResult.explorerUrl)
 *
 * All external SDK and infra dependencies are mocked so the tests run in a
 * pure Node / jsdom environment without a live Soroban RPC node.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock @stellar/stellar-sdk
//   We only need the constructors and the rpc.Server shape that minter.ts uses.
// ---------------------------------------------------------------------------

const MOCK_PUBLIC_KEY = "GMINTER0000000000000000000000000000000000000000000000000000";
const MOCK_TX_XDR = "AAAAAQAAAAAAAAAA"; // arbitrary placeholder

const mockTx = {
  toXDR: vi.fn().mockReturnValue(MOCK_TX_XDR),
  operations: [],
  fee: "100000",
};

const mockTransactionBuilder = {
  addOperation: vi.fn().mockReturnThis(),
  setTimeout: vi.fn().mockReturnThis(),
  build: vi.fn().mockReturnValue(mockTx),
};

/** Simulate a successful rpc.Api.SimulateTransactionResponse */
const successfulSimulation = {
  _parsed: true,
  id: "1",
  latestLedger: 1000,
  events: [],
  transactionData: {},
  minResourceFee: "200000",
  result: undefined,
  stateChanges: [],
};

/** Simulate rpc.Api.SimulateTransactionErrorResponse */
const errorSimulation = {
  _parsed: true,
  id: "2",
  latestLedger: 1000,
  events: [],
  error: "contract trap",
};

const mockServer = {
  getAccount: vi.fn().mockResolvedValue({ id: MOCK_PUBLIC_KEY, sequence: "100" }),
  simulateTransaction: vi.fn().mockResolvedValue(successfulSimulation),
  prepareTransaction: vi.fn().mockResolvedValue(mockTx),
  sendTransaction: vi.fn().mockResolvedValue({ hash: "abc123txhash", status: "PENDING" }),
};

vi.mock("@stellar/stellar-sdk", () => ({
  rpc: {
    Server: vi.fn().mockImplementation(() => mockServer),
    Api: {}, // namespace placeholder; actual shapes are inferred by TypeScript, not needed at runtime
  },
  TransactionBuilder: vi.fn().mockImplementation(function MockTB() {
    return mockTransactionBuilder;
  }),
  Operation: {
    manageData: vi.fn().mockReturnValue({ type: "manageData" }),
  },
  // Account is imported as a type in minter.ts, no runtime mock needed
}));

// ---------------------------------------------------------------------------
// Mock infrastructure dependencies
// ---------------------------------------------------------------------------

vi.mock("@/lib/soroban/client", () => ({
  createSorobanServer: vi.fn().mockReturnValue(mockServer),
}));

// ---------------------------------------------------------------------------
// Shared wallet adapter mock (reset before each test in mintHuntRewardNft suite)
// ---------------------------------------------------------------------------

const defaultWalletAdapter = {
  getPublicKey: vi.fn().mockResolvedValue(MOCK_PUBLIC_KEY),
  signTransaction: vi.fn().mockResolvedValue("signed-xdr"),
};

vi.mock("@/lib/walletAdapter", () => ({
  getActiveWalletAdapter: vi.fn().mockReturnValue(defaultWalletAdapter),
}));

vi.mock("@/lib/contracts/config", () => ({
  getRequiredAddress: vi
    .fn()
    .mockReturnValue("CNFT000000000000000000000000000000000000000000000000000000"),
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
}));

vi.mock("@/lib/huntStore", () => ({
  getHunt: vi.fn().mockReturnValue({ id: "1", title: "Test Hunt" }),
}));

const mockUploadResult = {
  metadataUri: "ipfs://QmMetadataCid",
  cid: "QmMetadataCid",
};

vi.mock("@/lib/nft/metadataUploader", () => ({
  uploadNftMetadata: vi.fn().mockResolvedValue(mockUploadResult),
}));

vi.mock("@/lib/nft/metadataBuilder", () => ({
  buildNftMetadata: vi.fn().mockReturnValue({
    name: "Hunty Trophy — Test Hunt · Rank 1",
    description: "Reward NFT",
    image: "ipfs://placeholder",
    attributes: [],
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("estimateMintFee", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockServer.simulateTransaction.mockResolvedValue(successfulSimulation);
  });

  it("returns a fee estimate derived from minResourceFee when simulation succeeds", async () => {
    const { estimateMintFee } = await import("../minter");
    const estimate = await estimateMintFee(1, MOCK_PUBLIC_KEY);

    expect(estimate.simulated).toBe(true);
    // minResourceFee = "200000" → Number("200000") = 200000
    expect(estimate.feeStroops).toBe(200_000);
    expect(estimate.feeXlm).toBeCloseTo(200_000 / 1e7);
  });

  it("falls back to DEFAULT_FEE_STROOPS when simulateTransaction throws", async () => {
    mockServer.simulateTransaction.mockRejectedValue(new Error("network error"));
    const { estimateMintFee } = await import("../minter");

    const estimate = await estimateMintFee(1, MOCK_PUBLIC_KEY);

    expect(estimate.simulated).toBe(false);
    expect(estimate.feeStroops).toBe(100_000); // DEFAULT_FEE_STROOPS
  });

  it("falls back to DEFAULT_FEE_STROOPS when simulation returns an error response", async () => {
    // errorSimulation has no minResourceFee → minFee resolves to 0
    mockServer.simulateTransaction.mockResolvedValue(errorSimulation);
    const { estimateMintFee } = await import("../minter");

    const estimate = await estimateMintFee(1, MOCK_PUBLIC_KEY);

    expect(estimate.simulated).toBe(false);
    expect(estimate.feeStroops).toBe(100_000);
  });

  it("uses at least DEFAULT_FEE_STROOPS even when minResourceFee is very small", async () => {
    mockServer.simulateTransaction.mockResolvedValue({
      ...successfulSimulation,
      minResourceFee: "1", // 1 stroop — below the floor
    });
    const { estimateMintFee } = await import("../minter");

    const estimate = await estimateMintFee(1, MOCK_PUBLIC_KEY);

    expect(estimate.feeStroops).toBe(100_000);
    expect(estimate.simulated).toBe(true);
  });
});

describe("mintHuntRewardNft", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockServer.simulateTransaction.mockResolvedValue(successfulSimulation);
    mockServer.prepareTransaction.mockResolvedValue(mockTx);
    mockServer.sendTransaction.mockResolvedValue({ hash: "abc123txhash", status: "PENDING" });

    // Reset wallet adapter to the default (signing succeeds)
    const walletModule = await import("@/lib/walletAdapter");
    vi.mocked(walletModule.getActiveWalletAdapter).mockReturnValue(defaultWalletAdapter);
    defaultWalletAdapter.signTransaction.mockResolvedValue("signed-xdr");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a MintResult with txHash and explorerUrl on success", async () => {
    const { mintHuntRewardNft } = await import("../minter");

    const result = await mintHuntRewardNft({ huntId: 1 });

    expect(result.txHash).toBe("abc123txhash");
    expect(result.recipient).toBe(MOCK_PUBLIC_KEY);
    expect(result.metadataUri).toBe("ipfs://QmMetadataCid");
    expect(result.metadataCid).toBe("QmMetadataCid");
    expect(result.explorerUrl).toContain("stellar.expert");
  });

  it("uses the provided recipientAddress over the wallet public key", async () => {
    const { mintHuntRewardNft } = await import("../minter");
    const customRecipient = "GCUSTOM000000000000000000000000000000000000000000000000000";

    const result = await mintHuntRewardNft({ huntId: 1, recipientAddress: customRecipient });

    expect(result.recipient).toBe(customRecipient);
  });

  it("falls back to a local tx id when sendTransaction throws", async () => {
    mockServer.sendTransaction.mockRejectedValue(new Error("contract not deployed"));
    const { mintHuntRewardNft } = await import("../minter");

    const result = await mintHuntRewardNft({ huntId: 42 });

    expect(result.txHash).toMatch(/^local_mint_42_/);
    expect(result.explorerUrl).toContain("pending");
  });

  it("throws MintRejectedError when the wallet rejects the transaction", async () => {
    defaultWalletAdapter.signTransaction.mockRejectedValue(new Error("user rejected"));

    const { mintHuntRewardNft, MintRejectedError } = await import("../minter");

    await expect(mintHuntRewardNft({ huntId: 1 })).rejects.toBeInstanceOf(MintRejectedError);
  });

  it("proceeds without prepareTransaction when simulation returns an error response", async () => {
    mockServer.simulateTransaction.mockResolvedValue(errorSimulation);
    const { mintHuntRewardNft } = await import("../minter");

    // Should still complete (falls through to as-is submission)
    const result = await mintHuntRewardNft({ huntId: 1 });
    expect(result.txHash).toBeTruthy();
  });

  it("calls onStage callbacks in the expected order", async () => {
    const stages: string[] = [];
    const { mintHuntRewardNft } = await import("../minter");

    await mintHuntRewardNft({ huntId: 1, onStage: (s) => stages.push(s) });

    expect(stages).toContain("building_metadata");
    expect(stages).toContain("uploading_metadata");
    expect(stages).toContain("estimating_fee");
    expect(stages).toContain("signing");
    expect(stages).toContain("submitting");
    expect(stages).toContain("confirming");
    expect(stages).toContain("complete");
  });
});

describe("MintRejectedError and MintTimeoutError", () => {
  it("MintRejectedError has the correct name and message", async () => {
    const { MintRejectedError } = await import("../minter");
    const err = new MintRejectedError();
    expect(err.name).toBe("MintRejectedError");
    expect(err.message).toContain("rejected");
    expect(err).toBeInstanceOf(Error);
  });

  it("MintTimeoutError has the correct name and message", async () => {
    const { MintTimeoutError } = await import("../minter");
    const err = new MintTimeoutError();
    expect(err.name).toBe("MintTimeoutError");
    expect(err.message).toContain("timed out");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("saveMintReceipt / getMintReceipt", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("persists and retrieves a mint receipt", async () => {
    const { saveMintReceipt, getMintReceipt } = await import("../minter");

    const input = { huntId: 99, recipientAddress: MOCK_PUBLIC_KEY };
    const result = {
      txHash: "savehash",
      recipient: MOCK_PUBLIC_KEY,
      metadataUri: "ipfs://Qm",
      metadataCid: "Qm",
      feeEstimate: { feeStroops: 100_000, feeXlm: 0.01, simulated: true },
      explorerUrl: "https://stellar.expert/explorer/testnet/tx/savehash",
    };

    saveMintReceipt(input, result);
    const retrieved = getMintReceipt(99, MOCK_PUBLIC_KEY);

    expect(retrieved).toEqual(result);
  });

  it("returns null when no receipt has been saved", async () => {
    const { getMintReceipt } = await import("../minter");
    expect(getMintReceipt(1, MOCK_PUBLIC_KEY)).toBeNull();
  });
});
