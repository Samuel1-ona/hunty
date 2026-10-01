/**
 * On-chain "Join Hunt" flow for mobile.
 *
 * Builds a Soroban `register_player(hunt_id: u64, player: Address)` invocation,
 * simulates it to attach the footprint and resource fee, hands the XDR to the
 * wallet for signing (WalletConnect `stellar_signXDR` via Web3Provider), then
 * submits it and waits for the ledger to confirm it.
 */
import env from '@config/env';
import {
  Address,
  BASE_FEE,
  Contract,
  nativeToScVal,
  rpc,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

import { classifyWalletTxError } from '@/lib/walletErrors';

export const JOIN_HUNT_METHOD = 'register_player';

/** Ordered stages of the join flow, surfaced to the UI as they happen. */
export type JoinHuntStage =
  | 'preparing'
  | 'awaiting_signature'
  | 'submitting'
  | 'confirming'
  | 'success';

export type JoinHuntErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_INPUT'
  | 'ACCOUNT_NOT_FOUND'
  | 'SIMULATION_FAILED'
  | 'SIGNATURE_REJECTED'
  | 'SIGNATURE_TIMEOUT'
  | 'SIGNATURE_FAILED'
  | 'SUBMISSION_FAILED'
  | 'TRANSACTION_FAILED'
  | 'CONFIRMATION_TIMEOUT'
  | 'NETWORK_ERROR';

export class JoinHuntError extends Error {
  readonly code: JoinHuntErrorCode;

  constructor(message: string, code: JoinHuntErrorCode) {
    super(message);
    this.name = 'JoinHuntError';
    this.code = code;
  }
}

/** Subset of `rpc.Server` used by the flow; injectable for tests. */
export type JoinHuntRpcServer = Pick<
  rpc.Server,
  'getAccount' | 'prepareTransaction' | 'sendTransaction' | 'getTransaction'
>;

export type JoinHuntConfig = {
  contractId: string;
  rpcUrl: string;
  networkPassphrase: string;
};

export type JoinHuntParams = {
  huntId: number;
  playerAddress: string;
  /** Signs a base64 transaction envelope and returns the signed envelope. */
  signTransaction: (xdr: string) => Promise<string>;
  onStage?: (stage: JoinHuntStage) => void;
  config?: Partial<JoinHuntConfig>;
  server?: JoinHuntRpcServer;
  /** Confirmation polling; defaults to 1.5s x 30 (~45s). */
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
};

export type JoinHuntResult = {
  transactionHash: string;
  ledger?: number;
};

const TX_TIMEOUT_SECONDS = 180;
const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/;

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function getJoinHuntConfig(overrides: Partial<JoinHuntConfig> = {}): JoinHuntConfig {
  return {
    contractId: overrides.contractId ?? env.huntyContractId,
    rpcUrl: overrides.rpcUrl ?? env.stellarRpcUrl,
    networkPassphrase: overrides.networkPassphrase ?? env.stellarNetworkPassphrase,
  };
}

export function isJoinHuntConfigured(overrides: Partial<JoinHuntConfig> = {}): boolean {
  return getJoinHuntConfig(overrides).contractId.trim().length > 0;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? '');
}

function validate(huntId: number, playerAddress: string): void {
  if (!Number.isSafeInteger(huntId) || huntId < 0) {
    throw new JoinHuntError('This hunt has an invalid identifier.', 'INVALID_INPUT');
  }
  if (!STELLAR_ADDRESS.test(playerAddress)) {
    throw new JoinHuntError(
      'Your wallet address is not a valid Stellar account. Reconnect your wallet.',
      'INVALID_INPUT',
    );
  }
}

/**
 * Builds and simulates the `register_player` transaction.
 * Returns the prepared (unsigned) transaction envelope as base64 XDR.
 */
export async function buildJoinHuntTransaction(
  server: JoinHuntRpcServer,
  config: JoinHuntConfig,
  huntId: number,
  playerAddress: string,
): Promise<string> {
  let account: Awaited<ReturnType<JoinHuntRpcServer['getAccount']>>;
  try {
    account = await server.getAccount(playerAddress);
  } catch (error) {
    const message = errorMessage(error).toLowerCase();
    if (message.includes('not found') || message.includes('404')) {
      throw new JoinHuntError(
        'Your wallet account was not found on the network. Fund it with testnet XLM and try again.',
        'ACCOUNT_NOT_FOUND',
      );
    }
    throw new JoinHuntError(
      'Could not reach the Stellar network. Check your connection and try again.',
      'NETWORK_ERROR',
    );
  }

  const contract = new Contract(config.contractId);
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      contract.call(
        JOIN_HUNT_METHOD,
        nativeToScVal(huntId, { type: 'u64' }),
        new Address(playerAddress).toScVal(),
      ),
    )
    .setTimeout(TX_TIMEOUT_SECONDS)
    .build();

  try {
    // Simulates the call, then attaches the footprint, auth, and resource fee.
    const prepared = await server.prepareTransaction(transaction);
    return prepared.toXDR();
  } catch {
    throw new JoinHuntError(
      'The hunt contract rejected this join. You may already be registered, or the hunt may be full or closed.',
      'SIMULATION_FAILED',
    );
  }
}

async function requestSignature(
  signTransaction: JoinHuntParams['signTransaction'],
  xdr: string,
): Promise<string> {
  try {
    return await signTransaction(xdr);
  } catch (error) {
    const classified = classifyWalletTxError(errorMessage(error));
    if (classified.kind === 'rejected') {
      throw new JoinHuntError(classified.message, 'SIGNATURE_REJECTED');
    }
    if (classified.kind === 'timeout') {
      throw new JoinHuntError(classified.message, 'SIGNATURE_TIMEOUT');
    }
    throw new JoinHuntError(
      errorMessage(error) || 'Your wallet could not sign the join request.',
      'SIGNATURE_FAILED',
    );
  }
}

async function submitAndConfirm(
  server: JoinHuntRpcServer,
  config: JoinHuntConfig,
  signedXdr: string,
  onStage: (stage: JoinHuntStage) => void,
  pollIntervalMs: number,
  maxPollAttempts: number,
  sleep: (ms: number) => Promise<void>,
): Promise<JoinHuntResult> {
  const signed = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);

  onStage('submitting');
  let sent: Awaited<ReturnType<JoinHuntRpcServer['sendTransaction']>>;
  try {
    sent = await server.sendTransaction(signed);
  } catch {
    throw new JoinHuntError(
      'Failed to submit your join request. Check your connection and try again.',
      'SUBMISSION_FAILED',
    );
  }

  if (sent.status === 'ERROR' || sent.status === 'TRY_AGAIN_LATER') {
    throw new JoinHuntError(
      sent.status === 'TRY_AGAIN_LATER'
        ? 'The network is busy. Please try joining again in a moment.'
        : 'The network rejected your join request.',
      'SUBMISSION_FAILED',
    );
  }

  onStage('confirming');
  for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
    let status: Awaited<ReturnType<JoinHuntRpcServer['getTransaction']>>;
    try {
      status = await server.getTransaction(sent.hash);
    } catch {
      // Transient RPC failure while polling; keep waiting.
      await sleep(pollIntervalMs);
      continue;
    }

    if (status.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return { transactionHash: sent.hash, ledger: status.ledger };
    }
    if (status.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new JoinHuntError(
        'Your join transaction failed on-chain. No fee beyond the network charge was spent.',
        'TRANSACTION_FAILED',
      );
    }
    await sleep(pollIntervalMs);
  }

  throw new JoinHuntError(
    'Your join request was submitted but not confirmed yet. Check back shortly.',
    'CONFIRMATION_TIMEOUT',
  );
}

/**
 * Runs the full join flow. Resolves once the ledger confirms the transaction;
 * rejects with a {@link JoinHuntError} describing which stage failed.
 */
export async function joinHuntOnChain(params: JoinHuntParams): Promise<JoinHuntResult> {
  const {
    huntId,
    playerAddress,
    signTransaction,
    onStage = () => undefined,
    pollIntervalMs = 1500,
    maxPollAttempts = 30,
    sleep = defaultSleep,
  } = params;

  const config = getJoinHuntConfig(params.config);
  if (!config.contractId.trim()) {
    throw new JoinHuntError(
      'Joining hunts is not available yet: the Hunty contract is not configured.',
      'NOT_CONFIGURED',
    );
  }
  validate(huntId, playerAddress);

  const server = params.server ?? new rpc.Server(config.rpcUrl);

  onStage('preparing');
  const unsignedXdr = await buildJoinHuntTransaction(server, config, huntId, playerAddress);

  onStage('awaiting_signature');
  const signedXdr = await requestSignature(signTransaction, unsignedXdr);

  const result = await submitAndConfirm(
    server,
    config,
    signedXdr,
    onStage,
    pollIntervalMs,
    maxPollAttempts,
    sleep,
  );
  onStage('success');
  return result;
}
