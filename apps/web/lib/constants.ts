import { MAINNET_NETWORK_PASSPHRASE } from "@/lib/soroban/client"
import { getSorobanNetworkPassphrase } from "@/lib/soroban/client"

export function getStellarExplorerUrl(hash: string): string {
  const passphrase = getSorobanNetworkPassphrase()
  const isMainnet = passphrase === MAINNET_NETWORK_PASSPHRASE
  const network = isMainnet ? "public" : "futurenet"
  return `https://stellar.expert/explorer/${network}/tx/${hash}`
}
