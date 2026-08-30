/**
 * Freighter wallet adapter.
 *
 * Freighter is the Stellar browser extension wallet maintained by SDF.
 * Docs: https://docs.freighter.app/
 */

import { getAddress, signTransaction as freighterSignTransaction } from '@stellar/freighter-api';
import type { ActiveWalletAdapter } from './types';

/**
 * Fetch the connected Freighter account's public key.
 * Throws a descriptive error if the extension is not available or
 * returns an empty address.
 */
export async function getFreighterPublicKey(): Promise<string> {
  const { address, error } = await getAddress();
  if (error) throw new Error(String(error));
  if (!address) throw new Error('Freighter wallet not available');
  return address;
}

/**
 * Sign a Stellar transaction XDR with the Freighter extension.
 * Returns the signed transaction XDR string.
 */
export async function signWithFreighter(xdr: string): Promise<string> {
  const result = await freighterSignTransaction(xdr);
  if (result.error) throw new Error(String(result.error));
  if (!result.signedTxXdr) throw new Error('Freighter cannot sign transaction');
  return result.signedTxXdr;
}

/**
 * Returns an ActiveWalletAdapter backed by the Freighter browser extension.
 */
export function createFreighterAdapter(): ActiveWalletAdapter {
  return {
    provider: 'freighter',
    getPublicKey: getFreighterPublicKey,
    signTransaction: signWithFreighter,
  };
}
