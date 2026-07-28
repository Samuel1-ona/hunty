/**
 * Comprehensive tests for Soroban contract interaction helpers
 * Tests cover: type-safe wrappers, error handling, gas estimation,
 * transaction simulation, typed returns, and retry logic
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  batchReadContracts,
  estimateGas,
  normalizeContractError,
  pollTransactionStatus,
  readContract,
  simulateTransaction,
  writeContract,
  writeContractAndWait,
  type ContractReadConfig,
  type ContractWriteConfig,
} from "../contractHelpers"

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@stellar/stellar-sdk", () => {
  const mockAccount = {
    id: "GTEST0000000000000000000000000000000000000000000000000000",
    sequence: "100",
    toXDR: vi.fn().mockReturnValue("mock-account-xdr"),
  }

  const mockTransaction = {
    toXDR: vi.fn().mockReturnValue("mock-xdr"),
    operations: [],
    fee: "100",
    networkPassphrase: "Test SDF Network ; September 2015",
  }

  const mockTransactionBuilder = {
    addOperation: vi.fn().mockReturnThis(),
    setTimeout: vi.fn().mockReturnThis(),
    build: vi.fn().mockReturnValue(mockTransaction),
  }

  const MockTransactionBuilder = vi.fn().mockReturnValue(mockTransactionBuilder)

  const mockServer = {
    getAccount: vi.fn().mockResolvedValue(mockAccount),
    submitTransaction: vi.fn().mockResolvedValue({ hash: "mock-tx-hash-123" }),
    simulateTransaction: vi.fn().mockResolvedValue({
      status: "SUCCESS",
      minResourceFee: "150000",
      cost: { cpuInsns: "500000", memBytes: "4096" },
      results: [],
    }),
    getTransaction: vi.fn().mockResolvedValue({ status: "SUCCESS" }),
  }

  const Server = vi.fn().mockReturnValue(mockServer)

  return {
    default: Server,
    Server,
    TransactionBuilder: MockTransactionBuilder,
    Operation: {
      manageData: vi.fn().mockReturnValue({ type: "manageData" }),
    },
    Account: vi.fn().mockImplementation(() => mockAccount),
  }
})

vi.mock("../client", () => ({
  getSorobanRpcUrl: vi.fn().mockReturnValue("https://soroban-testnet.stellar.org"),
  getSorobanNetworkPassphrase: vi.fn().mockReturnValue("Test SDF Network ; September 2015"),
  createSorobanServer: vi.fn().mockReturnValue({
    getAccount: vi.fn(),
    submitTransaction: vi.fn(),
    simulateTransaction: vi.fn(),
  }),
}))

vi.mock("../rpcRetry", () => ({
  withSorobanRpcRetry: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
}))

vi.mock("../../stellarErrors", () => ({
  parseStellarError: vi.fn().mockImplementation((error: unknown) => ({
    code: "UNKNOWN",
    message: error instanceof Error ? error.message : String(error),
    raw: error,
  })),
}))

// ============================================================================
// HELPERS
// ============================================================================

function createMockWallet(overrides?: {
  getPublicKey?: () => Promise<string>
  signTransaction?: (xdr: string) => Promise<string>
}) {
  return {
    provider: "freighter" as const,
    getPublicKey: vi.fn().mockResolvedValue(
      "GTEST0000000000000000000000000000000000000000000000000000"
    ),
    signTransaction: vi.fn().mockResolvedValue("signed-xdr-content"),
    ...overrides,
  }
}

function getMockServer() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: Server } = require("@stellar/stellar-sdk") as {
    default: ReturnType<typeof vi.fn>
  }
  return Server()
}

function createWriteConfig(overrides?: Partial<ContractWriteConfig>): ContractWriteConfig {
  return {
    contractId: "CTEST0000000000000000000000000000000000000000000000000000",
    method: "test_method",
    args: ["arg1", 42],
    wallet: createMockWallet(),
    ...overrides,
  }
}

// ============================================================================
// TESTS: normalizeContractError
// ============================================================================

describe("normalizeContractError", () => {
  it("wraps a plain Error with context prefix", () => {
    const error = new Error("network timeout")
    const result = normalizeContractError(error, "registerPlayer")
    expect(result.message).toBe("registerPlayer: network timeout")
    expect(result.raw).toBe(error)
  })

  it("wraps error without context when context is omitted", () => {
    const error = new Error("tx failed")
    const result = normalizeContractError(error)
    expect(result.message).toBe("tx failed")
  })

  it("handles non-Error thrown values", () => {
    const result = normalizeContractError("raw string error", "submit")
    expect(result.message).toBe("submit: raw string error")
    expect(result.raw).toBe("raw string error")
  })
})

// ============================================================================
// TESTS: estimateGas
// ============================================================================

describe("estimateGas", () => {
  it("returns fee and resource metrics from simulateTransaction", async () => {
    const server = getMockServer()
    const mockTx = { toXDR: vi.fn().mockReturnValue("mock-xdr") }

    const result = await estimateGas(server, mockTx as never)

    expect(result).toHaveProperty("fee")
    expect(typeof result.fee).toBe("string")
    expect(parseInt(result.fee, 10)).toBeGreaterThan(0)
  })

  it("includes cpu instructions when simulation provides them", async () => {
    const server = getMockServer()
    server.simulateTransaction.mockResolvedValueOnce({
      minResourceFee: "100000",
      cost: { cpuInsns: "500000", memBytes: "4096" },
    })

    const mockTx = { toXDR: vi.fn().mockReturnValue("mock-xdr") }
    const result = await estimateGas(server, mockTx as never)

    expect(result.cpuInstructions).toBe(500000)
    expect(result.memoryBytes).toBe(4096)
  })

  it("uses fallback fee when simulateTransaction is not available", async () => {
    const server = { ...getMockServer() }
    // Remove simulateTransaction
    delete (server as { simulateTransaction?: unknown }).simulateTransaction

    const mockTx = { toXDR: vi.fn().mockReturnValue("mock-xdr") }
    const result = await estimateGas(server, mockTx as never)

    expect(result).toHaveProperty("fee")
    expect(parseInt(result.fee, 10)).toBeGreaterThan(0)
  })

  it("throws normalized error on simulation failure", async () => {
    const server = getMockServer()
    server.simulateTransaction.mockRejectedValueOnce(new Error("RPC unreachable"))

    const mockTx = { toXDR: vi.fn().mockReturnValue("mock-xdr") }

    await expect(estimateGas(server, mockTx as never)).rejects.toMatchObject({
      message: expect.stringContaining("Gas estimation failed"),
    })
  })
})

// ============================================================================
// TESTS: simulateTransaction
// ============================================================================

describe("simulateTransaction", () => {
  it("returns success:true when simulation completes without error", async () => {
    const server = getMockServer()
    server.simulateTransaction.mockResolvedValueOnce({
      status: "SUCCESS",
      cost: { cpuInsns: "200000", memBytes: "2048" },
    })

    const mockTx = { toXDR: vi.fn().mockReturnValue("mock-xdr") }
    const result = await simulateTransaction(server, mockTx as never)

    expect(result.success).toBe(true)
    expect(result.status).toBe("SUCCESS")
    expect(result.cost).toEqual({ cpuInsns: "200000", memBytes: "2048" })
    expect(result.error).toBeUndefined()
  })

  it("returns success:false when simulation reports an error", async () => {
    const server = getMockServer()
    server.simulateTransaction.mockResolvedValueOnce({
      status: "FAILED",
      error: "Contract panic: unauthorized",
    })

    const mockTx = { toXDR: vi.fn().mockReturnValue("mock-xdr") }
    const result = await simulateTransaction(server, mockTx as never)

    expect(result.success).toBe(false)
    expect(result.status).toBe("FAILED")
    expect(result.error).toBe("Contract panic: unauthorized")
  })

  it("returns optimistic success when simulateTransaction method is unavailable", async () => {
    const server = getMockServer()
    delete (server as { simulateTransaction?: unknown }).simulateTransaction

    const mockTx = { toXDR: vi.fn().mockReturnValue("mock-xdr") }
    const result = await simulateTransaction(server, mockTx as never)

    expect(result.success).toBe(true)
    expect(result.status).toBe("SIMULATION_NOT_AVAILABLE")
  })

  it("throws normalized error when simulation call throws", async () => {
    const server = getMockServer()
    server.simulateTransaction.mockRejectedValueOnce(new Error("RPC timeout"))

    const mockTx = { toXDR: vi.fn().mockReturnValue("mock-xdr") }

    await expect(simulateTransaction(server, mockTx as never)).rejects.toMatchObject({
      message: expect.stringContaining("Transaction simulation failed"),
    })
  })
})

// ============================================================================
// TESTS: writeContract
// ============================================================================

describe("writeContract", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("returns txHash and gasEstimate on success", async () => {
    const config = createWriteConfig()

    const result = await writeContract(config)

    expect(result).toHaveProperty("txHash", "mock-tx-hash-123")
    expect(result).toHaveProperty("gasEstimate")
    expect(typeof result.gasEstimate).toBe("number")
    expect(result.gasEstimate).toBeGreaterThan(0)
  })

  it("calls wallet.getPublicKey and wallet.signTransaction", async () => {
    const wallet = createMockWallet()
    const config = createWriteConfig({ wallet })

    await writeContract(config)

    expect(wallet.getPublicKey).toHaveBeenCalledTimes(1)
    expect(wallet.signTransaction).toHaveBeenCalledTimes(1)
  })

  it("uses custom fee when provided, skipping gas estimation", async () => {
    const wallet = createMockWallet()
    const config = createWriteConfig({ wallet, fee: "999999" })

    const result = await writeContract(config)

    expect(result.gasEstimate).toBe(999999)
  })

  it("throws when wallet.getPublicKey fails", async () => {
    const wallet = createMockWallet({
      getPublicKey: vi.fn().mockRejectedValue(new Error("Wallet not connected")),
    })
    const config = createWriteConfig({ wallet })

    await expect(writeContract(config)).rejects.toMatchObject({
      message: expect.stringContaining("test_method"),
    })
  })

  it("throws when wallet.signTransaction fails (user rejected)", async () => {
    const wallet = createMockWallet({
      signTransaction: vi.fn().mockRejectedValue(new Error("User rejected request")),
    })
    const config = createWriteConfig({ wallet })

    await expect(writeContract(config)).rejects.toMatchObject({
      message: expect.stringContaining("test_method"),
    })
  })

  it("throws when submitTransaction returns no hash", async () => {
    const server = getMockServer()
    server.submitTransaction.mockResolvedValueOnce({})

    const config = createWriteConfig()

    await expect(writeContract(config)).rejects.toMatchObject({
      message: expect.stringContaining("test_method"),
    })
  })

  it("throws when simulation fails", async () => {
    const server = getMockServer()
    server.simulateTransaction.mockResolvedValueOnce({
      status: "FAILED",
      error: "Contract not found",
    })

    const config = createWriteConfig()

    await expect(writeContract(config)).rejects.toMatchObject({
      message: expect.stringContaining("test_method"),
    })
  })

  it("includes simulationStatus in result", async () => {
    const server = getMockServer()
    server.simulateTransaction.mockResolvedValueOnce({
      status: "SUCCESS",
      minResourceFee: "100",
      cost: { cpuInsns: "1000", memBytes: "512" },
    })

    const config = createWriteConfig()

    const result = await writeContract(config)
    expect(result).toHaveProperty("simulationStatus")
  })
})

// ============================================================================
// TESTS: readContract
// ============================================================================

describe("readContract", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("returns parsed data from a successful RPC read", async () => {
    const mockFetch = vi.mocked(globalThis.fetch as ReturnType<typeof vi.fn>)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          hunt_id: 1,
          player: "GTEST...",
          current_clue_index: 2,
          completed: false,
        },
      }),
    })

    type Progress = {
      hunt_id: number
      player: string
      current_clue_index: number
      completed: boolean
    }

    const config: ContractReadConfig = {
      contractId: "CTEST...",
      method: "get_player_progress",
      args: [1, "GTEST..."],
      parser: (raw: unknown) => raw as Progress,
    }

    const result = await readContract<Progress>(config)

    expect(result.data).toEqual({
      hunt_id: 1,
      player: "GTEST...",
      current_clue_index: 2,
      completed: false,
    })
  })

  it("uses default parser (identity) when no parser is provided", async () => {
    const mockFetch = vi.mocked(globalThis.fetch as ReturnType<typeof vi.fn>)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { foo: "bar" } }),
    })

    const result = await readContract({ contractId: "C...", method: "test_read" })

    expect(result.data).toEqual({ foo: "bar" })
  })

  it("throws when RPC returns an error", async () => {
    const mockFetch = vi.mocked(globalThis.fetch as ReturnType<typeof vi.fn>)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: { message: "Contract not found" } }),
    })

    await expect(
      readContract({ contractId: "C...", method: "bad_method" })
    ).rejects.toMatchObject({
      message: expect.stringContaining("bad_method"),
    })
  })

  it("throws when HTTP request fails", async () => {
    const mockFetch = vi.mocked(globalThis.fetch as ReturnType<typeof vi.fn>)
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 })

    await expect(
      readContract({ contractId: "C...", method: "read_method" })
    ).rejects.toMatchObject({
      message: expect.stringContaining("read_method"),
    })
  })

  it("allows custom type-safe parsers for typed return values", async () => {
    const mockFetch = vi.mocked(globalThis.fetch as ReturnType<typeof vi.fn>)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: { raw_value: "100", active: "true" },
      }),
    })

    type ParsedResult = { balance: number; isActive: boolean }

    const result = await readContract<ParsedResult>({
      contractId: "C...",
      method: "get_balance",
      parser: (raw: unknown) => {
        const r = raw as { raw_value: string; active: string }
        return { balance: parseInt(r.raw_value, 10), isActive: r.active === "true" }
      },
    })

    expect(result.data.balance).toBe(100)
    expect(result.data.isActive).toBe(true)
  })
})

// ============================================================================
// TESTS: pollTransactionStatus
// ============================================================================

describe("pollTransactionStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("resolves immediately for mock_tx_ prefixed hashes", async () => {
    const result = await pollTransactionStatus("mock_tx_12345")
    expect(result).toBe(true)
  })

  it("returns true when transaction reaches SUCCESS status", async () => {
    const server = getMockServer()
    server.getTransaction.mockResolvedValueOnce({ status: "SUCCESS" })

    const result = await pollTransactionStatus("real-hash-abc", {
      maxAttempts: 3,
      pollInterval: 1,
    })
    expect(result).toBe(true)
  })

  it("returns true after PENDING then SUCCESS", async () => {
    const server = getMockServer()
    server.getTransaction
      .mockResolvedValueOnce({ status: "PENDING" })
      .mockResolvedValueOnce({ status: "SUCCESS" })

    const result = await pollTransactionStatus("hash-pending-then-success", {
      maxAttempts: 5,
      pollInterval: 1,
    })
    expect(result).toBe(true)
  })

  it("throws when transaction fails", async () => {
    const server = getMockServer()
    server.getTransaction.mockResolvedValueOnce({ status: "FAILED" })

    await expect(
      pollTransactionStatus("failed-hash", { maxAttempts: 3, pollInterval: 1 })
    ).rejects.toThrow("Transaction failed")
  })

  it("throws when polling times out", async () => {
    const server = getMockServer()
    server.getTransaction.mockResolvedValue({ status: "PENDING" })

    await expect(
      pollTransactionStatus("stuck-hash", {
        maxAttempts: 2,
        pollInterval: 1,
      })
    ).rejects.toThrow("timed out")
  })

  it("calls onPoll callback for each attempt", async () => {
    const server = getMockServer()
    server.getTransaction
      .mockResolvedValueOnce({ status: "PENDING" })
      .mockResolvedValueOnce({ status: "SUCCESS" })

    const onPoll = vi.fn()

    await pollTransactionStatus("hash-with-callback", {
      maxAttempts: 5,
      pollInterval: 1,
      onPoll,
    })

    expect(onPoll).toHaveBeenCalledWith(1)
    expect(onPoll).toHaveBeenCalledWith(2)
  })

  it("uses fallback RPC fetch when getTransaction is not on server", async () => {
    const server = getMockServer()
    delete (server as { getTransaction?: unknown }).getTransaction

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        result: { status: "SUCCESS" },
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const result = await pollTransactionStatus("fallback-rpc-hash", {
      maxAttempts: 3,
      pollInterval: 1,
    })
    expect(result).toBe(true)

    vi.unstubAllGlobals()
  })
})

// ============================================================================
// TESTS: writeContractAndWait
// ============================================================================

describe("writeContractAndWait", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("calls writeContract then polls for confirmation", async () => {
    const config = createWriteConfig()

    const result = await writeContractAndWait(config, { maxAttempts: 1, pollInterval: 1 })

    expect(result).toHaveProperty("txHash")
    expect(result.txHash).toBe("mock-tx-hash-123")
  })

  it("rejects if polling times out", async () => {
    const server = getMockServer()
    // Return non-mock hash so real polling runs
    server.submitTransaction.mockResolvedValueOnce({ hash: "real-hash-to-poll" })
    server.getTransaction.mockResolvedValue({ status: "PENDING" })

    const config = createWriteConfig()

    await expect(
      writeContractAndWait(config, { maxAttempts: 2, pollInterval: 1 })
    ).rejects.toThrow()
  })
})

// ============================================================================
// TESTS: batchReadContracts
// ============================================================================

describe("batchReadContracts", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("returns results for all successful reads", async () => {
    const mockFetch = vi.mocked(globalThis.fetch as ReturnType<typeof vi.fn>)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { id: 1 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { id: 2 } }),
      })

    const configs: ContractReadConfig[] = [
      { contractId: "C1...", method: "get_item_1" },
      { contractId: "C2...", method: "get_item_2" },
    ]

    const results = await batchReadContracts(configs)

    expect(results).toHaveLength(2)
    expect("data" in results[0]).toBe(true)
    expect("data" in results[1]).toBe(true)
  })

  it("returns error object for failed reads without throwing", async () => {
    const mockFetch = vi.mocked(globalThis.fetch as ReturnType<typeof vi.fn>)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { id: 1 } }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 })

    const configs: ContractReadConfig[] = [
      { contractId: "C1...", method: "get_ok" },
      { contractId: "C2...", method: "get_fail" },
    ]

    const results = await batchReadContracts(configs)

    expect(results).toHaveLength(2)
    expect("data" in results[0]).toBe(true)
    expect("error" in results[1]).toBe(true)
  })

  it("handles an empty array", async () => {
    const results = await batchReadContracts([])
    expect(results).toHaveLength(0)
  })

  it("processes all reads in parallel", async () => {
    const mockFetch = vi.mocked(globalThis.fetch as ReturnType<typeof vi.fn>)
    const callOrder: number[] = []

    mockFetch
      .mockImplementationOnce(async () => {
        callOrder.push(1)
        return { ok: true, json: async () => ({ result: "first" }) }
      })
      .mockImplementationOnce(async () => {
        callOrder.push(2)
        return { ok: true, json: async () => ({ result: "second" }) }
      })

    const configs: ContractReadConfig[] = [
      { contractId: "C1...", method: "read_1" },
      { contractId: "C2...", method: "read_2" },
    ]

    await batchReadContracts(configs)

    // Both should have been called
    expect(callOrder).toContain(1)
    expect(callOrder).toContain(2)
  })
})

// ============================================================================
// TESTS: retry integration
// ============================================================================

describe("retry logic integration", () => {
  it("withSorobanRpcRetry is invoked for account loading in writeContract", async () => {
    const { withSorobanRpcRetry } = await import("../rpcRetry")
    const retryMock = vi.mocked(withSorobanRpcRetry)

    const config = createWriteConfig()
    await writeContract(config)

    // At least one retry-wrapped call should have occurred
    expect(retryMock).toHaveBeenCalled()
  })

  it("withSorobanRpcRetry is invoked for RPC reads in readContract", async () => {
    const mockFetch = vi.mocked(globalThis.fetch as ReturnType<typeof vi.fn>)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: null }),
    })

    const { withSorobanRpcRetry } = await import("../rpcRetry")
    const retryMock = vi.mocked(withSorobanRpcRetry)

    vi.stubGlobal("fetch", mockFetch)

    await readContract({ contractId: "C...", method: "test_read" })

    expect(retryMock).toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})
