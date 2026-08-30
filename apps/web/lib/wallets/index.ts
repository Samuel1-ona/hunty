/**
 * lib/wallets — barrel export
 *
 * All wallet adapter implementations and the Zustand wallet store.
 */

export type { WalletProvider, ActiveWalletAdapter } from './types';
export {
  createFreighterAdapter,
  getFreighterPublicKey,
  signWithFreighter,
} from './freighterAdapter';
export { createAlbedoAdapter, getAlbedoPublicKey, signWithAlbedo } from './albedoAdapter';
export { createXBullAdapter, getXBullPublicKey, signWithXBull } from './xbullAdapter';
export { useWalletStore } from './walletStore';
export type { WalletStore, WalletState, WalletActions } from './walletStore';
