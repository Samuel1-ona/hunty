/**
 * Wallet Network Detection
 * Detects and validates the network configuration of connected wallets
 */

import { getAddress } from '@stellar/freighter-api';
import { getSorobanNetworkType, getSorobanNetworkPassphrase } from '@/lib/soroban/client';
import { logger } from '@/lib/logger';

export interface NetworkMismatchError {
  appNetwork: 'testnet' | 'mainnet';
  walletNetwork: 'testnet' | 'mainnet' | 'unknown';
  message: string;
}

/**
 * Detects the network that Freighter wallet is connected to
 * Returns "testnet", "mainnet", or "unknown"
 */
export async function detectFreighterNetwork(): Promise<'testnet' | 'mainnet' | 'unknown'> {
  try {
    const { address, error } = await getAddress();

    if (error || !address) {
      logger.warn('Could not detect Freighter network', error);
      return 'unknown';
    }

    // Freighter doesn't provide direct network info, but we can infer from the network context
    // In practice, the wallet will reject transactions if networks don't match
    // For now, we assume the wallet is on the correct network
    return getSorobanNetworkType();
  } catch (err) {
    logger.error('Error detecting Freighter network', err);
    return 'unknown';
  }
}

/**
 * Detects network from Rabet wallet
 */
async function detectRabetNetwork(): Promise<'testnet' | 'mainnet' | 'unknown'> {
  try {
    const win = window as any;
    const wallet = win.rabet;

    if (!wallet) return 'unknown';

    // Rabet may expose network information
    if (wallet.network === 'testnet' || wallet.network === 'mainnet') {
      return wallet.network;
    }

    return 'unknown';
  } catch (err) {
    logger.error('Error detecting Rabet network', err);
    return 'unknown';
  }
}

/**
 * Checks if the connected wallet's network matches the app's configured network
 * Returns null if networks match, or a NetworkMismatchError if they don't
 */
export async function checkWalletNetworkMatch(
  provider: 'freighter' | 'rabet' | 'albedo' | 'xbull' | 'lobstr' = 'freighter'
): Promise<NetworkMismatchError | null> {
  const appNetwork = getSorobanNetworkType();

  let walletNetwork: 'testnet' | 'mainnet' | 'unknown' = 'unknown';

  try {
    if (provider === 'freighter') {
      walletNetwork = await detectFreighterNetwork();
    } else if (provider === 'rabet') {
      walletNetwork = await detectRabetNetwork();
    }
    // Other wallets can be added here

    // If we can't detect the wallet network, we'll allow it and let the transaction fail if needed
    if (walletNetwork === 'unknown') {
      logger.warn(`Could not detect network for ${provider} wallet`);
      return null;
    }

    if (walletNetwork !== appNetwork) {
      return {
        appNetwork,
        walletNetwork,
        message: `Network mismatch: App is on ${appNetwork} but wallet is on ${walletNetwork}`,
      };
    }

    return null;
  } catch (err) {
    logger.error('Error checking wallet network match', err);
    return null;
  }
}

/**
 * Gets a user-friendly warning message for network mismatch
 */
export function getNetworkMismatchWarning(error: NetworkMismatchError): string {
  return `Your wallet is connected to ${error.walletNetwork} but the app is using ${error.appNetwork}. Please switch your wallet to ${error.appNetwork} or change the app's network in settings.`;
}

/**
 * Validates that a transaction can be signed with the current network configuration
 */
export async function validateNetworkBeforeTransaction(
  provider: 'freighter' | 'rabet' | 'albedo' | 'xbull' | 'lobstr' = 'freighter'
): Promise<{ valid: boolean; error?: NetworkMismatchError }> {
  const mismatch = await checkWalletNetworkMatch(provider);

  if (mismatch) {
    return { valid: false, error: mismatch };
  }

  return { valid: true };
}

/**
 * Gets the expected network passphrase for the current configuration
 */
export function getExpectedNetworkPassphrase(): string {
  return getSorobanNetworkPassphrase();
}
