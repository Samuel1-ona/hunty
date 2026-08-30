import {
  getSorobanRpcUrl,
  getSorobanNetworkPassphrase,
  getSorobanNetworkType,
} from '../soroban/client';

export const SOROBAN_RPC_URL = getSorobanRpcUrl();
export const NETWORK_PASSPHRASE = getSorobanNetworkPassphrase();

/**
 * Contract addresses for testnet
 */
const TESTNET_CONTRACTS = {
  HUNTY_CORE:
    process.env.NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET ??
    process.env.NEXT_PUBLIC_HUNTY_CORE_ADDRESS ??
    '',
  REWARD_MANAGER:
    process.env.NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_TESTNET ??
    process.env.NEXT_PUBLIC_REWARD_MANAGER_ADDRESS ??
    '',
  NFT_REWARD:
    process.env.NEXT_PUBLIC_NFT_REWARD_ADDRESS_TESTNET ??
    process.env.NEXT_PUBLIC_NFT_REWARD_ADDRESS ??
    '',
} as const;

/**
 * Contract addresses for mainnet
 */
const MAINNET_CONTRACTS = {
  HUNTY_CORE: process.env.NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET ?? '',
  REWARD_MANAGER: process.env.NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_MAINNET ?? '',
  NFT_REWARD: process.env.NEXT_PUBLIC_NFT_REWARD_ADDRESS_MAINNET ?? '',
} as const;

/**
 * Gets the contract addresses for the current network
 */
export function getContracts() {
  const networkType = getSorobanNetworkType();
  return networkType === 'mainnet' ? MAINNET_CONTRACTS : TESTNET_CONTRACTS;
}

/**
 * Current contract addresses (network-aware)
 */
export const CONTRACTS = getContracts();

/** Backward-compat alias — prefer CONTRACTS.REWARD_MANAGER in new code. */
export const REWARD_MANAGER_ADDRESS = CONTRACTS.REWARD_MANAGER;

const ENV_VAR_NAMES: Record<keyof typeof TESTNET_CONTRACTS, { testnet: string; mainnet: string }> =
  {
    HUNTY_CORE: {
      testnet: 'NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET',
      mainnet: 'NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET',
    },
    REWARD_MANAGER: {
      testnet: 'NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_TESTNET',
      mainnet: 'NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_MAINNET',
    },
    NFT_REWARD: {
      testnet: 'NEXT_PUBLIC_NFT_REWARD_ADDRESS_TESTNET',
      mainnet: 'NEXT_PUBLIC_NFT_REWARD_ADDRESS_MAINNET',
    },
  };

export function getRequiredAddress(key: keyof typeof TESTNET_CONTRACTS): string {
  const contracts = getContracts();
  const address = contracts[key];
  const networkType = getSorobanNetworkType();

  if (!address) {
    const envVarName = ENV_VAR_NAMES[key][networkType];
    throw new Error(
      `Missing ${key} address for ${networkType}. Set ${envVarName} in your environment.`
    );
  }
  return address;
}

/** Backward-compat helper — prefer getRequiredAddress("REWARD_MANAGER") in new code. */
export function getRequiredRewardManagerAddress(): string {
  return getRequiredAddress('REWARD_MANAGER');
}
