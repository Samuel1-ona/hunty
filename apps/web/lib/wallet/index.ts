/**
 * lib/wallet — barrel export
 *
 * Wallet connection state machine and utilities.
 * The state machine replaces ad-hoc boolean flags with a proper finite
 * state machine (idle → connecting → connected ↔ disconnected | error).
 */

export {
  walletReducer,
  INITIAL_WALLET_STATE,
  tryRestoreSession,
  useWalletMachine,
  isValidTransition,
  getWalletStatusLabel,
} from './walletMachine';

export type {
  WalletStatus,
  WalletMachineState,
  WalletEvent,
  UseWalletMachineReturn,
} from './walletMachine';
