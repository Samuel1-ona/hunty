import {
  JOIN_HUNT_METHOD,
  JoinHuntError,
  type JoinHuntRpcServer,
  type JoinHuntStage,
  joinHuntOnChain,
} from '@services/joinHunt';

/**
 * The Stellar SDK is replaced with a recording double so the tests can assert
 * exactly which contract call is built and what is handed to the wallet,
 * without network access or real XDR encoding.
 */
const mockCalls: Array<{ contractId: string; method: string; args: unknown[] }> = [];

jest.mock('@stellar/stellar-sdk', () => {
  class Contract {
    id: string;
    constructor(id: string) {
      this.id = id;
    }
    call(method: string, ...args: unknown[]) {
      mockCalls.push({ contractId: this.id, method, args });
      return { type: 'invokeHostFunction', method, args };
    }
  }
  class Address {
    value: string;
    constructor(value: string) {
      this.value = value;
    }
    toScVal() {
      return { address: this.value };
    }
  }
  class TransactionBuilder {
    operations: unknown[] = [];
    options: { fee: string; networkPassphrase: string };
    constructor(_account: unknown, options: { fee: string; networkPassphrase: string }) {
      this.options = options;
    }
    addOperation(op: unknown) {
      this.operations.push(op);
      return this;
    }
    setTimeout() {
      return this;
    }
    build() {
      return { kind: 'unsigned', operations: this.operations, options: this.options };
    }
    static fromXDR(xdr: string, passphrase: string) {
      return { kind: 'signed', xdr, passphrase };
    }
  }
  return {
    Address,
    BASE_FEE: '100',
    Contract,
    TransactionBuilder,
    nativeToScVal: (value: unknown, opts: { type: string }) => ({ [opts.type]: value }),
    rpc: {
      Server: jest.fn(),
      Api: {
        GetTransactionStatus: { SUCCESS: 'SUCCESS', FAILED: 'FAILED', NOT_FOUND: 'NOT_FOUND' },
      },
    },
  };
});

jest.mock('@config/env', () => ({
  __esModule: true,
  default: {
    huntyContractId: '',
    stellarRpcUrl: 'https://rpc.test',
    stellarNetworkPassphrase: 'Test SDF Network ; September 2015',
  },
}));

const PLAYER = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
const CONTRACT_ID = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const config = { contractId: CONTRACT_ID };

function makeServer(overrides: Partial<Record<keyof JoinHuntRpcServer, jest.Mock>> = {}) {
  const server = {
    getAccount: jest.fn().mockResolvedValue({ accountId: PLAYER, sequence: '1' }),
    prepareTransaction: jest.fn().mockResolvedValue({ toXDR: () => 'PREPARED_XDR' }),
    sendTransaction: jest.fn().mockResolvedValue({ status: 'PENDING', hash: 'a'.repeat(64) }),
    getTransaction: jest.fn().mockResolvedValue({ status: 'SUCCESS', ledger: 4242 }),
    ...overrides,
  };
  return server as unknown as JoinHuntRpcServer & typeof server;
}

const noSleep = () => Promise.resolve();

async function expectJoinError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(JoinHuntError);
  await expect(promise).rejects.toMatchObject({ code });
}

describe('joinHuntOnChain', () => {
  beforeEach(() => {
    mockCalls.length = 0;
  });

  it('invokes register_player with a u64 hunt id and the player address', async () => {
    const server = makeServer();

    await joinHuntOnChain({
      huntId: 7,
      playerAddress: PLAYER,
      signTransaction: async () => 'SIGNED_XDR',
      config,
      server,
      sleep: noSleep,
    });

    expect(mockCalls).toEqual([
      {
        contractId: CONTRACT_ID,
        method: JOIN_HUNT_METHOD,
        args: [{ u64: 7 }, { address: PLAYER }],
      },
    ]);
    expect(JOIN_HUNT_METHOD).toBe('register_player');
    expect(server.getAccount).toHaveBeenCalledWith(PLAYER);
  });

  it('asks the wallet to sign the simulated transaction and submits the signed one', async () => {
    const server = makeServer();
    const signTransaction = jest.fn().mockResolvedValue('SIGNED_XDR');

    const result = await joinHuntOnChain({
      huntId: 3,
      playerAddress: PLAYER,
      signTransaction,
      config,
      server,
      sleep: noSleep,
    });

    // The wallet signs what prepareTransaction (simulation) produced, not the raw build.
    expect(server.prepareTransaction).toHaveBeenCalledTimes(1);
    expect(signTransaction).toHaveBeenCalledWith('PREPARED_XDR');
    expect(server.sendTransaction).toHaveBeenCalledWith({
      kind: 'signed',
      xdr: 'SIGNED_XDR',
      passphrase: 'Test SDF Network ; September 2015',
    });
    expect(result).toEqual({ transactionHash: 'a'.repeat(64), ledger: 4242 });
  });

  it('reports each stage in order', async () => {
    const stages: JoinHuntStage[] = [];

    await joinHuntOnChain({
      huntId: 1,
      playerAddress: PLAYER,
      signTransaction: async () => 'SIGNED_XDR',
      onStage: (stage) => stages.push(stage),
      config,
      server: makeServer(),
      sleep: noSleep,
    });

    expect(stages).toEqual([
      'preparing',
      'awaiting_signature',
      'submitting',
      'confirming',
      'success',
    ]);
  });

  it('keeps polling until the transaction is confirmed', async () => {
    const getTransaction = jest
      .fn()
      .mockResolvedValueOnce({ status: 'NOT_FOUND' })
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValueOnce({ status: 'SUCCESS', ledger: 9 });
    const sleep = jest.fn(noSleep);

    const result = await joinHuntOnChain({
      huntId: 1,
      playerAddress: PLAYER,
      signTransaction: async () => 'SIGNED_XDR',
      config,
      server: makeServer({ getTransaction }),
      pollIntervalMs: 10,
      sleep,
    });

    expect(getTransaction).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledWith(10);
    expect(result.ledger).toBe(9);
  });

  it('refuses to run when no contract is configured', async () => {
    const server = makeServer();

    await expectJoinError(
      joinHuntOnChain({
        huntId: 1,
        playerAddress: PLAYER,
        signTransaction: jest.fn(),
        server,
      }),
      'NOT_CONFIGURED',
    );
    expect(server.getAccount).not.toHaveBeenCalled();
  });

  it.each([
    [-1, PLAYER],
    [1.5, PLAYER],
    [1, 'not-an-address'],
  ])('rejects invalid input (hunt %p, player %p)', async (huntId, playerAddress) => {
    await expectJoinError(
      joinHuntOnChain({
        huntId,
        playerAddress,
        signTransaction: jest.fn(),
        config,
        server: makeServer(),
      }),
      'INVALID_INPUT',
    );
  });

  it('explains an unfunded account', async () => {
    const server = makeServer({
      getAccount: jest.fn().mockRejectedValue(new Error('Account not found: GBRP...')),
    });

    await expectJoinError(
      joinHuntOnChain({
        huntId: 1,
        playerAddress: PLAYER,
        signTransaction: jest.fn(),
        config,
        server,
      }),
      'ACCOUNT_NOT_FOUND',
    );
  });

  it('does not ask the wallet to sign when simulation fails', async () => {
    const signTransaction = jest.fn();
    const server = makeServer({
      prepareTransaction: jest.fn().mockRejectedValue(new Error('HostError: already registered')),
    });

    await expectJoinError(
      joinHuntOnChain({ huntId: 1, playerAddress: PLAYER, signTransaction, config, server }),
      'SIMULATION_FAILED',
    );
    expect(signTransaction).not.toHaveBeenCalled();
  });

  it('classifies a wallet rejection and submits nothing', async () => {
    const server = makeServer();

    await expectJoinError(
      joinHuntOnChain({
        huntId: 1,
        playerAddress: PLAYER,
        signTransaction: jest.fn().mockRejectedValue(new Error('User rejected the request.')),
        config,
        server,
      }),
      'SIGNATURE_REJECTED',
    );
    expect(server.sendTransaction).not.toHaveBeenCalled();
  });

  it('classifies a wallet timeout', async () => {
    await expectJoinError(
      joinHuntOnChain({
        huntId: 1,
        playerAddress: PLAYER,
        signTransaction: jest.fn().mockRejectedValue(new Error('Request expired')),
        config,
        server: makeServer(),
      }),
      'SIGNATURE_TIMEOUT',
    );
  });

  it.each(['ERROR', 'TRY_AGAIN_LATER'])('fails when the RPC answers %s', async (status) => {
    const server = makeServer({
      sendTransaction: jest.fn().mockResolvedValue({ status, hash: 'b'.repeat(64) }),
    });

    await expectJoinError(
      joinHuntOnChain({
        huntId: 1,
        playerAddress: PLAYER,
        signTransaction: async () => 'SIGNED_XDR',
        config,
        server,
      }),
      'SUBMISSION_FAILED',
    );
    expect(server.getTransaction).not.toHaveBeenCalled();
  });

  it('fails when the transaction fails on-chain', async () => {
    await expectJoinError(
      joinHuntOnChain({
        huntId: 1,
        playerAddress: PLAYER,
        signTransaction: async () => 'SIGNED_XDR',
        config,
        server: makeServer({ getTransaction: jest.fn().mockResolvedValue({ status: 'FAILED' }) }),
        sleep: noSleep,
      }),
      'TRANSACTION_FAILED',
    );
  });

  it('stops waiting after the polling budget', async () => {
    const getTransaction = jest.fn().mockResolvedValue({ status: 'NOT_FOUND' });

    await expectJoinError(
      joinHuntOnChain({
        huntId: 1,
        playerAddress: PLAYER,
        signTransaction: async () => 'SIGNED_XDR',
        config,
        server: makeServer({ getTransaction }),
        maxPollAttempts: 4,
        sleep: noSleep,
      }),
      'CONFIRMATION_TIMEOUT',
    );
    expect(getTransaction).toHaveBeenCalledTimes(4);
  });
});
