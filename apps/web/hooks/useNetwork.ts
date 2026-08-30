'use client';

import { useEffect, useState } from 'react';
import {
  getSorobanNetworkType,
  setSorobanNetworkType,
  getCurrentNetworkConfig,
  getSorobanNetworkPassphrase,
  getSorobanRpcUrl,
} from '@/lib/soroban/client';

export type NetworkType = 'testnet' | 'mainnet';

interface NetworkInfo {
  networkType: NetworkType;
  rpcUrl: string;
  networkPassphrase: string;
  isTestnet: boolean;
  isMainnet: boolean;
}

/**
 * Hook to get and manage the current Stellar network configuration
 */
export function useNetwork() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>(() => {
    const networkType = getSorobanNetworkType();
    return {
      networkType,
      rpcUrl: getSorobanRpcUrl(),
      networkPassphrase: getSorobanNetworkPassphrase(),
      isTestnet: networkType === 'testnet',
      isMainnet: networkType === 'mainnet',
    };
  });

  useEffect(() => {
    // Update network info when it changes
    const updateNetworkInfo = () => {
      const networkType = getSorobanNetworkType();
      setNetworkInfo({
        networkType,
        rpcUrl: getSorobanRpcUrl(),
        networkPassphrase: getSorobanNetworkPassphrase(),
        isTestnet: networkType === 'testnet',
        isMainnet: networkType === 'mainnet',
      });
    };

    // Listen for storage changes (network switches in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'stellar_network_preference') {
        updateNetworkInfo();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * Switch to a different network
   * This will reload the page to reinitialize all connections
   */
  const switchNetwork = (newNetwork: NetworkType) => {
    if (newNetwork === networkInfo.networkType) return;

    setSorobanNetworkType(newNetwork);

    // Reload to reinitialize everything with new network
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return {
    ...networkInfo,
    switchNetwork,
    config: getCurrentNetworkConfig(),
  };
}
