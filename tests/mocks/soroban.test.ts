import { describe, it, expect, beforeEach } from "vitest";
import {
  setupSorobanMocks,
  resetSorobanMocks,
  sorobanMockConfig,
  MockServer,
  mockWalletAdapter,
  FIXTURES,
} from "./soroban";

describe("Soroban Contract Interaction Mocks", () => {
  beforeEach(() => {
    resetSorobanMocks();
  });

  describe("1. Shared Test Fixtures", () => {
    it("should provide valid playerProgress fixtures", () => {
      const prog = FIXTURES.playerProgress.registered(456, "GPLAYER123");
      expect(prog.hunt_id).toBe(456);
      expect(prog.player).toBe("GPLAYER123");
      expect(prog.completed).toBe(false);
      expect(prog.reward_claimed).toBe(false);

      const comp = FIXTURES.playerProgress.completed();
      expect(comp.completed).toBe(true);

      const claimed = FIXTURES.playerProgress.claimed();
      expect(claimed.reward_claimed).toBe(true);
    });

    it("should provide valid huntInfo fixtures", () => {
      const draft = FIXTURES.huntInfo.draft(789);
      expect(draft.id).toBe(789);
      expect(draft.active).toBe(false);

      const active = FIXTURES.huntInfo.active();
      expect(active.active).toBe(true);
    });

    it("should provide valid rewardEscrow fixtures", () => {
      const escrow = FIXTURES.rewardEscrow.active(111);
      expect(escrow.huntId).toBe(111);
      expect(escrow.rewardType).toBe("XLM");
    });
  });

  describe("2. Mock Soroban RPC Client (MockServer)", () => {
    it("should retrieve account info successfully by default", async () => {
      const server = new MockServer("https://mock-rpc-url");
      const account = await server.getAccount("GPLAYER");
      expect(account.accountId).toBe("GPLAYER");
      expect(account.sequenceNumber()).toBe("12345");
    });

    it("should support custom account sequences", async () => {
      setupSorobanMocks({ accountSequence: "99999" });
      const server = new MockServer("https://mock-rpc-url");
      const account = await server.getAccount("GPLAYER");
      expect(account.sequenceNumber()).toBe("99999");
    });

    it("should fail getAccount when configured to fail", async () => {
      setupSorobanMocks({ shouldFailGetAccount: true });
      const server = new MockServer("https://mock-rpc-url");
      await expect(server.getAccount("GPLAYER")).rejects.toThrow("RPC Error: Account not found");
    });

    it("should submit transaction successfully by default", async () => {
      const server = new MockServer("https://mock-rpc-url");
      const res = await server.submitTransaction("mock-xdr");
      expect(res.hash).toBe("mock-tx-hash-abc123xyz");
    });

    it("should fail submitTransaction when configured to fail", async () => {
      setupSorobanMocks({ shouldFailSubmit: true });
      const server = new MockServer("https://mock-rpc-url");
      await expect(server.submitTransaction("mock-xdr")).rejects.toThrow("RPC Error: Transaction submission failed");
    });

    it("should get transaction status successfully by default", async () => {
      const server = new MockServer("https://mock-rpc-url");
      const res = await server.getTransaction("hash-123");
      expect(res.status).toBe("SUCCESS");
      expect(res.hash).toBe("hash-123");
    });

    it("should fail getTransaction when configured to fail", async () => {
      setupSorobanMocks({ shouldFailGetTransaction: true });
      const server = new MockServer("https://mock-rpc-url");
      await expect(server.getTransaction("hash-123")).rejects.toThrow("RPC Error: Network error");
    });

    it("should simulate transaction successfully by default", async () => {
      const server = new MockServer("https://mock-rpc-url");
      const res = await server.simulateTransaction({});
      expect(res.latestLedger).toBe(1000);
    });

    it("should fail simulateTransaction when configured to fail", async () => {
      setupSorobanMocks({ shouldFailSimulate: true });
      const server = new MockServer("https://mock-rpc-url");
      await expect(server.simulateTransaction({})).rejects.toThrow("RPC Error: Simulation failed");
    });
  });

  describe("3. Mock Transaction Signing (mockWalletAdapter)", () => {
    it("should return public key successfully by default", async () => {
      const pk = await mockWalletAdapter.getPublicKey();
      expect(pk).toBe("GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
    });

    it("should fail getPublicKey when configured to fail", async () => {
      setupSorobanMocks({ shouldFailWalletPublicKey: true });
      await expect(mockWalletAdapter.getPublicKey()).rejects.toThrow("Wallet Error: User rejected connection");
    });

    it("should sign transaction successfully by default", async () => {
      const signed = await mockWalletAdapter.signTransaction("tx-xdr");
      expect(signed).toBe("mock-signed-xdr-envelope");
    });

    it("should fail signTransaction when configured to fail", async () => {
      setupSorobanMocks({ shouldFailWalletSign: true });
      await expect(mockWalletAdapter.signTransaction("tx-xdr")).rejects.toThrow("Wallet Error: User rejected signing");
    });
  });
});
