import { vi } from "vitest";

/**
 * Configuration interface for Soroban and wallet mocks.
 */
export interface SorobanMockConfig {
  // Account settings
  accountSequence?: string;
  shouldFailGetAccount?: boolean;

  // Transaction submission settings
  submitHash?: string;
  shouldFailSubmit?: boolean;

  // Transaction status settings
  transactionStatus?: "SUCCESS" | "NOT_FOUND" | "FAILED";
  shouldFailGetTransaction?: boolean;

  // Simulation settings
  simulatedResults?: any;
  shouldFailSimulate?: boolean;

  // Wallet settings
  walletPublicKey?: string;
  signedXdr?: string;
  shouldFailWalletPublicKey?: boolean;
  shouldFailWalletSign?: boolean;
}

// Default configuration
const DEFAULT_CONFIG: SorobanMockConfig = {
  accountSequence: "12345",
  shouldFailGetAccount: false,
  submitHash: "mock-tx-hash-abc123xyz",
  shouldFailSubmit: false,
  transactionStatus: "SUCCESS",
  shouldFailGetTransaction: false,
  shouldFailSimulate: false,
  walletPublicKey: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  signedXdr: "mock-signed-xdr-envelope",
  shouldFailWalletPublicKey: false,
  shouldFailWalletSign: false,
};

// Global mock state
export let sorobanMockConfig: SorobanMockConfig = { ...DEFAULT_CONFIG };

/**
 * Updates the active mock configuration.
 * @param config Partial configuration to override defaults.
 */
export function setupSorobanMocks(config: Partial<SorobanMockConfig> = {}): void {
  sorobanMockConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };
}

/**
 * Resets the mock configuration to default values and clears all mock calls.
 */
export function resetSorobanMocks(): void {
  sorobanMockConfig = { ...DEFAULT_CONFIG };
  
  // Reset all vitest mock functions
  MockOperation.manageData.mockClear();
  mockWalletAdapter.getPublicKey.mockClear();
  mockWalletAdapter.signTransaction.mockClear();
}

// ==========================================
// 1. Mock Soroban RPC Client & Stellar SDK
// ==========================================

export class MockAccount {
  constructor(public accountId: string, public sequence: string = "1") {}
  sequenceNumber(): string {
    return this.sequence;
  }
}

export class MockTransactionBuilder {
  operations: any[] = [];
  constructor(public account: any, public opts: any) {}
  addOperation(op: any) {
    this.operations.push(op);
    return this;
  }
  setTimeout(timeout: number) {
    return this;
  }
  build() {
    return {
      toXDR: () => `mock-xdr-ops-${this.operations.length}`,
    };
  }
}

export const MockOperation = {
  manageData: vi.fn((opts: { name: string; value: string | Buffer }) => ({
    type: "manageData",
    ...opts,
  })),
};

export class MockServer {
  constructor(public rpcUrl: string) {}

  getAccount = vi.fn().mockImplementation(async (publicKey: string) => {
    if (sorobanMockConfig.shouldFailGetAccount) {
      throw new Error("RPC Error: Account not found");
    }
    return new MockAccount(publicKey, sorobanMockConfig.accountSequence);
  });

  submitTransaction = vi.fn().mockImplementation(async (signedXdr: string) => {
    if (sorobanMockConfig.shouldFailSubmit) {
      throw new Error("RPC Error: Transaction submission failed");
    }
    return {
      hash: sorobanMockConfig.submitHash,
    };
  });

  getTransaction = vi.fn().mockImplementation(async (hash: string) => {
    if (sorobanMockConfig.shouldFailGetTransaction) {
      throw new Error("RPC Error: Network error");
    }
    return {
      status: sorobanMockConfig.transactionStatus,
      hash,
    };
  });

  simulateTransaction = vi.fn().mockImplementation(async (tx: any) => {
    if (sorobanMockConfig.shouldFailSimulate) {
      throw new Error("RPC Error: Simulation failed");
    }
    return (
      sorobanMockConfig.simulatedResults ?? {
        results: [],
        latestLedger: 1000,
      }
    );
  });
}

// ==========================================
// 2. Mock Transaction Signing (Wallet)
// ==========================================

export const mockWalletAdapter = {
  provider: "freighter" as const,
  getPublicKey: vi.fn().mockImplementation(async () => {
    if (sorobanMockConfig.shouldFailWalletPublicKey) {
      throw new Error("Wallet Error: User rejected connection");
    }
    return sorobanMockConfig.walletPublicKey;
  }),
  signTransaction: vi.fn().mockImplementation(async (xdr: string) => {
    if (sorobanMockConfig.shouldFailWalletSign) {
      throw new Error("Wallet Error: User rejected signing");
    }
    return sorobanMockConfig.signedXdr ?? `signed-${xdr}`;
  }),
};

// ==========================================
// 3. Shared Test Fixtures for Contract Data
// ==========================================

export const FIXTURES = {
  playerProgress: {
    registered: (huntId = 123, player = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX") => ({
      hunt_id: huntId,
      player,
      current_clue_index: 2,
      completed: false,
      reward_claimed: false,
    }),
    completed: (huntId = 123, player = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX") => ({
      hunt_id: huntId,
      player,
      current_clue_index: 5,
      completed: true,
      reward_claimed: false,
    }),
    claimed: (huntId = 123, player = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX") => ({
      hunt_id: huntId,
      player,
      current_clue_index: 5,
      completed: true,
      reward_claimed: true,
    }),
  },
  huntInfo: {
    draft: (id = 123, creator = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX") => ({
      id,
      creator,
      title: "Test Hunt",
      description: "A test scavenger hunt",
      start_time: Math.floor(Date.now() / 1000) + 3600,
      end_time: Math.floor(Date.now() / 1000) + 7200,
      active: false,
      clue_count: 0,
    }),
    active: (id = 123, creator = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX") => ({
      id,
      creator,
      title: "Active Test Hunt",
      description: "An active test scavenger hunt",
      start_time: Math.floor(Date.now() / 1000) - 3600,
      end_time: Math.floor(Date.now() / 1000) + 3600,
      active: true,
      clue_count: 3,
    }),
  },
  rewardEscrow: {
    active: (huntId = 123, creator = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX") => ({
      huntId,
      creator,
      rewardType: "XLM" as const,
      totalPool: 100,
      balance: 100,
      rewards: [{ id: "r1", amount: 10, claimed: false }],
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
      depositTxHash: "mock-deposit-hash-123",
      createdAt: Math.floor(Date.now() / 1000) - 3600,
      distributions: [],
      refunds: [],
    }),
  },
};

// Automatic module mocking for tests that import this mock file
vi.mock("@stellar/stellar-sdk", () => {
  return {
    default: MockServer,
    Server: MockServer,
    TransactionBuilder: MockTransactionBuilder,
    Operation: MockOperation,
    Account: MockAccount,
    Networks: {
      TESTNET: "Test SDF Network ; September 2015",
      PUBLIC: "Public Global Stellar Network ; September 2015",
    },
  };
});

vi.mock("@/lib/walletAdapter", () => {
  return {
    getActiveWalletAdapter: () => mockWalletAdapter,
  };
});
