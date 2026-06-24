import { getHuntsByCreator, getHuntById } from "@/lib/huntStore"
import { NETWORK_PASSPHRASE } from "@/lib/contracts/config"
import type { RewardHistoryEntry, RewardHistoryType } from "@/lib/types"

const DEFAULT_PLAYER_HISTORY: RewardHistoryEntry[] = [
  {
    id: "player-xlm-1",
    type: "XLM",
    amount: 12.5,
    description: "Claimed first place completion reward",
    txHash: "mock_tx_xlm_1",
    earnedAt: "2026-02-10T15:16:00Z",
    huntId: 1,
    huntName: "City Secrets",
    explorerUrl: "https://stellar.expert/explorer/testnet/tx/mock_tx_xlm_1",
  },
  {
    id: "player-nft-1",
    type: "NFT",
    description: "Unlocked collectible reward for completing City Secrets.",
    txHash: "mock_tx_nft_1",
    earnedAt: "2026-02-10T15:18:00Z",
    huntId: 1,
    huntName: "City Secrets",
    explorerUrl: "https://stellar.expert/explorer/testnet/tx/mock_tx_nft_1",
  },
  {
    id: "player-xlm-2",
    type: "XLM",
    amount: 3.75,
    description: "Claimed bonus reward for fast completion.",
    txHash: "mock_tx_xlm_2",
    earnedAt: "2026-03-04T12:02:00Z",
    huntId: 3,
    huntName: "Office Onboarding Hunt",
    explorerUrl: "https://stellar.expert/explorer/testnet/tx/mock_tx_xlm_2",
  },
  {
    id: "player-nft-2",
    type: "NFT",
    description: "Unlocked Explorer Trophy reward.",
    txHash: "mock_tx_nft_2",
    earnedAt: "2026-02-20T11:26:00Z",
    huntId: 3,
    huntName: "Office Onboarding Hunt",
    explorerUrl: "https://stellar.expert/explorer/testnet/tx/mock_tx_nft_2",
  },
]

const DEFAULT_CREATOR_HISTORY: RewardHistoryEntry[] = [
  {
    id: "creator-xlm-1",
    type: "XLM",
    amount: 150,
    description: "Distributed XLM reward pool to top finishers.",
    txHash: "mock_tx_dist_xlm_1",
    earnedAt: "2026-02-10T15:20:00Z",
    huntId: 1,
    huntName: "City Secrets",
    recipient: "GAD7...FGHA",
    explorerUrl: "https://stellar.expert/explorer/testnet/tx/mock_tx_dist_xlm_1",
  },
  {
    id: "creator-nft-1",
    type: "NFT",
    description: "Minted and distributed the Golden Compass collectible.",
    txHash: "mock_tx_dist_nft_1",
    earnedAt: "2026-02-10T15:22:00Z",
    huntId: 1,
    huntName: "City Secrets",
    recipient: "GAD7...FGHA",
    explorerUrl: "https://stellar.expert/explorer/testnet/tx/mock_tx_dist_nft_1",
  },
  {
    id: "creator-xlm-2",
    type: "XLM",
    amount: 40,
    description: "Distributed XLM bonus rewards for Campus Quest.",
    txHash: "mock_tx_dist_xlm_2",
    earnedAt: "2026-02-18T19:05:00Z",
    huntId: 2,
    huntName: "Campus Quest",
    recipient: "GBYL...KQTC",
    explorerUrl: "https://stellar.expert/explorer/testnet/tx/mock_tx_dist_xlm_2",
  },
]

function getExplorerUrl(hash: string): string {
  if (!hash) return "#"
  const network = NETWORK_PASSPHRASE.toLowerCase()
  const isPublic = !/future|test/i.test(network)
  return isPublic
    ? `https://stellar.expert/explorer/public/tx/${hash}`
    : `https://stellar.expert/explorer/testnet/tx/${hash}`
}

export async function fetchPlayerRewardHistory(address: string): Promise<RewardHistoryEntry[]> {
  if (!address) return []
  return DEFAULT_PLAYER_HISTORY.map((entry) => ({
    ...entry,
    explorerUrl: getExplorerUrl(entry.txHash),
  }))
}

export async function fetchCreatorRewardHistory(address: string): Promise<RewardHistoryEntry[]> {
  if (!address) return []

  const hunts = getHuntsByCreator(address)
  const huntMap = new Map<number, string>(hunts.map((hunt) => [hunt.id, hunt.title]))

  return DEFAULT_CREATOR_HISTORY.map((entry) => ({
    ...entry,
    huntName: huntMap.get(entry.huntId ?? -1) ?? entry.huntName,
    explorerUrl: getExplorerUrl(entry.txHash),
  }))
}
