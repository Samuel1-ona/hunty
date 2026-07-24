import { getSorobanRpcUrl, getSorobanNetworkPassphrase } from "../soroban/client"

export const SOROBAN_RPC_URL = getSorobanRpcUrl()
export const NETWORK_PASSPHRASE = getSorobanNetworkPassphrase()

export const CONTRACTS = {
  HUNTY_CORE: process.env.NEXT_PUBLIC_HUNTY_CORE_ADDRESS ?? "",
  REWARD_MANAGER: process.env.NEXT_PUBLIC_REWARD_MANAGER_ADDRESS ?? "",
  NFT_REWARD: process.env.NEXT_PUBLIC_NFT_REWARD_ADDRESS ?? "",
} as const

/** Backward-compat alias — prefer CONTRACTS.REWARD_MANAGER in new code. */
export const REWARD_MANAGER_ADDRESS = CONTRACTS.REWARD_MANAGER

const ENV_VAR_NAMES: Record<keyof typeof CONTRACTS, string> = {
  HUNTY_CORE: "NEXT_PUBLIC_HUNTY_CORE_ADDRESS",
  REWARD_MANAGER: "NEXT_PUBLIC_REWARD_MANAGER_ADDRESS",
  NFT_REWARD: "NEXT_PUBLIC_NFT_REWARD_ADDRESS",
}

export function getRequiredAddress(key: keyof typeof CONTRACTS): string {
  const address = CONTRACTS[key]
  if (!address) {
    throw new Error(
      `Missing ${key} address. Set ${ENV_VAR_NAMES[key]} in your environment.`,
    )
  }
  return address
}

/** Backward-compat helper — prefer getRequiredAddress("REWARD_MANAGER") in new code. */
export function getRequiredRewardManagerAddress(): string {
  return getRequiredAddress("REWARD_MANAGER")
}
