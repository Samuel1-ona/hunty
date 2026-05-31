"use client"

import { useEffect, useMemo, useState } from "react"
import { formatISOString } from "@/lib/dateUtils"

import { Header } from "@/components/Header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWallet, shortenAddress } from "@/lib/context/WalletContext"
import { NftGallery } from "@/components/NftGallery"
import { BadgeWall } from "@/components/BadgeWall"
import type { NftRewardDetail } from "@/components/NftDetailModal"

type HuntProgressStatus = "Completed" | "In-Progress"

interface PlayerHuntProgress {
  id: number
  title: string
  description: string
  totalClues: number
  status: HuntProgressStatus
  pointsEarned: number
  startedAt: string
  completedAt?: string
}

// Temporary data fetcher; replace with real Soroban/indexer integration calling
// `get_player_progress` for the connected player's address.
type NftReward = NftRewardDetail

async function fetchPlayerHunts(address: string): Promise<PlayerHuntProgress[]> {
  // In a real implementation this would:
  // 1. Fetch all hunts from your indexer or contract.
  // 2. For each hunt, call `get_player_progress(hunt_id, address)`.
  // 3. Filter down to hunts where the player has any progress.
  //
  // For now we simulate a few hunts with mixed completion states.
  if (!address) return []

  return [
    {
      id: 1,
      title: "City Secrets",
      description: "Race across town to uncover hidden murals and landmarks.",
      totalClues: 5,
      status: "Completed",
      pointsEarned: 12,
      startedAt: "2026-02-10T14:32:00Z",
      completedAt: "2026-02-10T15:12:00Z",
    },
    {
      id: 2,
      title: "Campus Quest",
      description: "Solve riddles scattered around campus before the timer ends.",
      totalClues: 7,
      status: "In-Progress",
      pointsEarned: 4,
      startedAt: "2026-02-18T17:05:00Z",
    },
    {
      id: 3,
      title: "Office Onboarding Hunt",
      description: "A playful intro game for new teammates around the office.",
      totalClues: 4,
      status: "Completed",
      pointsEarned: 9,
      startedAt: "2026-02-20T11:00:00Z",
      completedAt: "2026-02-20T11:25:00Z",
    },
  ]
}

async function fetchPlayerRewards(address: string): Promise<NftReward[]> {
  if (!address) return []

  return [
    {
      id: 1,
      name: "Golden Compass",
      description: "A legendary artifact awarded to those who uncover all secret murals in the City Secrets hunt.",
      imageUri: "/static-images/nft1.png",
      earnedAt: "2026-02-10T15:16:00Z",
      claimed: true,
      huntName: "City Secrets",
      attributes: [
        { trait_type: "Rarity", value: "Legendary" },
        { trait_type: "Type", value: "Utility" },
      ]
    },
    {
      id: 2,
      name: "Explorer Trophy",
      description: "Granted for successfully completing the Office Onboarding challenge within the time limit.",
      imageUri: "/static-images/nft2.png",
      earnedAt: "2026-02-20T11:26:00Z",
      claimed: false,
      huntName: "Office Onboarding",
      attributes: [
        { trait_type: "Rarity", value: "Rare" },
        { trait_type: "Level", value: 5 },
      ]
    },
    {
      id: 3,
      name: "Soroban Sage",
      description: "Awarded to players who demonstrate exceptional knowledge of smart contract riddles.",
      imageUri: "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG", // Example IPFS
      earnedAt: "2026-03-05T09:45:00Z",
      claimed: true,
      huntName: "Stellar Developer Hunt",
      attributes: [
        { trait_type: "Rarity", value: "Epic" },
        { trait_type: "Skill", value: "Contracting" },
      ]
    }
  ]
}


export default function UserProfilePage() {
  const { connected, publicKey } = useWallet()
  const [hunts, setHunts] = useState<PlayerHuntProgress[]>([])
  const [nftRewards, setNftRewards] = useState<NftReward[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!connected || !publicKey) {
      setHunts([])
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    const load = async () => {
      try {
        const data = await fetchPlayerHunts(publicKey)
        if (!cancelled) {
          setHunts(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load profile data.")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    const loadRewards = async () => {
      try {
        const rewardsData = await fetchPlayerRewards(publicKey!)
        if (!cancelled) {
          setNftRewards(rewardsData)
        }
      } catch (err) {
        console.error("Failed to load NFT rewards:", err)
      }
    }

    load()
    loadRewards()

    return () => {
      cancelled = true
    }
  }, [connected, publicKey])

  const summary = useMemo(() => {
    if (!hunts.length) {
      return {
        totalHunts: 0,
        completedHunts: 0,
        inProgressHunts: 0,
        totalPoints: 0,
        completionRate: 0,
      }
    }

    const completedHunts = hunts.filter((h) => h.status === "Completed").length
    const inProgressHunts = hunts.filter((h) => h.status === "In-Progress").length
    const totalPoints = hunts.reduce((sum, h) => sum + h.pointsEarned, 0)
    const completionRate = Math.round((completedHunts / hunts.length) * 100)

    return {
      totalHunts: hunts.length,
      completedHunts,
      inProgressHunts,
      totalPoints,
      completionRate,
      totalNftRewards: nftRewards.length,
      claimedNftRewards: nftRewards.filter((nft) => nft.claimed).length,
      unclaimedNftRewards: nftRewards.filter((nft) => !nft.claimed).length,
    }
  }, [hunts, nftRewards])

  const completedHunts = hunts.filter((h) => h.status === "Completed")
  const inProgressHunts = hunts.filter((h) => h.status === "In-Progress")

  const displayAddress = publicKey ? shortenAddress(publicKey) : "Not connected"

  return (
    <div className="min-h-screen bg-linear-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] pb-20">
      <Header />

      <div className="max-w-[1500px] mx-auto px-6 sm:px-10 pt-4 pb-12 bg-white rounded-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text">
              Player Profile
            </h1>
            <p className="text-sm md:text-base text-slate-600 mt-2">
              View your hunt history, progress, and total points earned.
            </p>
          </div>

          <Card className="border border-slate-200 bg-white/70 shadow-sm px-4 py-3 flex flex-col gap-1 max-w-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">Connected Wallet</div>
            <div className="font-mono text-sm text-slate-800 break-all">{displayAddress}</div>
          </Card>
        </div>

        {!connected || !publicKey ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 py-10 text-center px-6">
            <h2 className="text-xl md:text-2xl font-semibold text-slate-800 mb-2">
              Connect your wallet to see your history
            </h2>
            <p className="text-sm text-slate-600 mb-4 max-w-md">
              Your profile uses the connected Stellar address to load hunts you&apos;ve played and aggregate your
              points across games.
            </p>
            <p className="text-xs text-slate-500">
              Use the <span className="font-semibold">Connect Wallet</span> button in the header to get started.
            </p>
          </div>
        ) : (
          <>
            <section aria-label="Player statistics" className="mt-6">
              <Card className="bg-[#ececfa] border border-white/40 shadow-md">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg md:text-xl font-semibold text-slate-900">
                      Summary statistics
                    </CardTitle>
                    <CardDescription>
                      Aggregated from all hunts where you have progress via <code>get_player_progress</code>.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatPill label="Total Hunts Played" value={summary.totalHunts} />
                    <StatPill label="Completed Hunts" value={summary.completedHunts} />
                    <StatPill label="In-Progress Hunts" value={summary.inProgressHunts} />
                    <StatPill
                      label="Total Points Earned"
                      value={summary.totalPoints}
                      valueClassName="text-emerald-600"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <StatPill label="NFT Rewards" value={summary.totalNftRewards ?? 0} />
                    <StatPill label="NFTs Claimed" value={summary.claimedNftRewards ?? 0} />
                    <StatPill label="NFTs Unclaimed" value={summary.unclaimedNftRewards ?? 0} />
                  </div>
                  <div className="mt-4 text-sm text-slate-600">
                    Completion rate:{" "}
                    <span className="font-semibold text-slate-800">{summary.completionRate}%</span>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section aria-label="NFT Rewards" className="mt-8">
              <div className="flex items-center justify-between gap-2 mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold bg-linear-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent">
                    Digital Trophies
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Collectible rewards earned through your achievements</p>
                </div>
                <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold">
                  {nftRewards.length} Unlocked
                </span>
              </div>
              
              <NftGallery nfts={nftRewards} />
            </section>

            <section aria-label="Achievements" className="mt-8">
              <BadgeWall playerAddress={publicKey} />
            </section>

            <section aria-label="Hunt history" className="mt-10 space-y-8">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl md:text-2xl font-semibold bg-linear-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent">
                  Hunt History
                </h2>
                {isLoading && (
                  <span className="text-xs md:text-sm text-slate-500">Refreshing your latest games…</span>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {!isLoading && !hunts.length && !error && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 py-10 text-center text-slate-600">
                  You haven&apos;t played any hunts yet. Join a game from the arcade to see your history here.
                </div>
              )}

              {hunts.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">In-Progress Hunts</h3>
                    {inProgressHunts.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No hunts currently in progress. Jump into a new game from the arcade.
                      </p>
                    ) : (
                      <ul className="space-y-4">
                        {inProgressHunts.map((hunt) => (
                          <li key={hunt.id}>
                            <HuntCard hunt={hunt} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Completed Hunts</h3>
                    {completedHunts.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        You haven&apos;t completed any hunts yet. Finish a game to see it here.
                      </p>
                    ) : (
                      <ul className="space-y-4">
                        {completedHunts.map((hunt) => (
                          <li key={hunt.id}>
                            <HuntCard hunt={hunt} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function StatPill({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: number
  valueClassName?: string
}) {
  return (
    <div className="rounded-2xl bg-white/70 border border-slate-200 px-4 py-3 flex flex-col gap-1 shadow-sm">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`text-xl font-semibold text-slate-900 ${valueClassName ?? ""}`}>{value}</span>
    </div>
  )
}

function HuntCard({ hunt }: { hunt: PlayerHuntProgress }) {
  const isCompleted = hunt.status === "Completed"

  return (
    <Card className="border border-slate-200 bg-white/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base md:text-lg font-semibold text-slate-900">
              {hunt.title}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2 text-xs md:text-sm">
              {hunt.description}
            </CardDescription>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              isCompleted
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {isCompleted ? "Completed" : "In Progress"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-slate-600">
          <span>
            Clues:{" "}
            <span className="font-semibold text-slate-800">
              {hunt.pointsEarned}/{hunt.totalClues}
            </span>
          </span>
          <span>
            Points earned:{" "}
            <span className="font-semibold text-emerald-700">{hunt.pointsEarned}</span>
          </span>
          {hunt.startedAt && (
            <span>
              Started:{" "}
              <span className="font-medium text-slate-700">
                {formatISOString(hunt.startedAt)}
              </span>
            </span>
          )}
          {hunt.completedAt && (
            <span>
              Finished:{" "}
              <span className="font-medium text-slate-700">
                {formatISOString(hunt.completedAt)}
              </span>
            </span>
          )}
        </div>
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            className="text-xs md:text-sm rounded-full border-slate-300 hover:bg-slate-50"
          >
            View details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

