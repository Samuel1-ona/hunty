"use client"

import { useCallback, useEffect, useState } from "react"
import { Crown, Gift, Star, Trophy, Users, Zap } from "lucide-react"
import { shortenAddress } from "@/lib/context/WalletContext"
import type {
  ReferralLeaderboardEntry,
  ReferralLeaderboardPeriod,
  ReferralLeaderboardStats,
} from "@/lib/types"

// ─── API fetch ────────────────────────────────────────────────────────────────

interface LeaderboardResponse {
  leaderboard: ReferralLeaderboardEntry[]
  stats: ReferralLeaderboardStats
  playerRank?: ReferralLeaderboardEntry
  period: ReferralLeaderboardPeriod
}

async function fetchReferralLeaderboard(
  period: ReferralLeaderboardPeriod,
  address?: string
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams({ period })
  if (address) params.set("address", address)
  const res = await fetch(`/api/v1/referrals/leaderboard?${params.toString()}`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error("Failed to fetch referral leaderboard")
  return res.json() as Promise<LeaderboardResponse>
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const RANK_MEDALS: Record<number, { icon: typeof Trophy; color: string; label: string }> = {
  1: { icon: Trophy, color: "text-yellow-400", label: "1st" },
  2: { icon: Star, color: "text-slate-300", label: "2nd" },
  3: { icon: Crown, color: "text-amber-600", label: "3rd" },
}

function RankBadge({ rank }: { rank: number }) {
  const medal = RANK_MEDALS[rank]
  if (!medal) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-xs font-bold text-zinc-400">
        {rank}
      </span>
    )
  }
  const Icon = medal.icon
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10">
      <Icon className={`w-4 h-4 ${medal.color}`} aria-label={medal.label} />
    </span>
  )
}

function PayoutBadge({ status, amount }: { status?: string; amount?: number }) {
  if (!status) return null
  const styles: Record<string, string> = {
    pending: "bg-amber-900/40 text-amber-300 border-amber-700/40",
    processing: "bg-blue-900/40 text-blue-300 border-blue-700/40",
    paid: "bg-emerald-900/40 text-emerald-300 border-emerald-700/40",
    failed: "bg-red-900/40 text-red-300 border-red-700/40",
  }
  const style = styles[status] ?? styles.pending
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}
      data-testid={`payout-badge-${status}`}
    >
      <Gift className="w-3 h-3" />
      {status === "paid" && amount ? `+${amount} pts` : status}
    </span>
  )
}

function StatsCard({
  stats,
  rewardPool,
}: {
  stats: ReferralLeaderboardStats
  rewardPool: { rank: number; pts: number }[]
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Referrers</div>
        <div className="text-2xl font-bold text-white">{stats.totalReferrers}</div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Successful</div>
        <div className="text-2xl font-bold text-emerald-400">{stats.totalSuccessfulReferrals}</div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Bonus Distributed</div>
        <div className="text-2xl font-bold text-violet-300">{stats.totalBonusDistributed} pts</div>
      </div>
      <div className="bg-violet-900/40 border border-violet-700/40 rounded-xl p-4">
        <div className="text-xs text-violet-300 uppercase tracking-wide mb-1 flex items-center gap-1">
          <Zap className="w-3 h-3" /> Reward Pool
        </div>
        <div className="space-y-1">
          {rewardPool.map((tier) => (
            <div key={tier.rank} className="flex items-center gap-1 text-xs text-zinc-300">
              <RankBadge rank={tier.rank} />
              <span className="font-semibold text-violet-300">{tier.pts} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="w-8 h-8 rounded-full bg-white/10" /></td>
      <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-white/10" /></td>
      <td className="px-4 py-3 text-center"><div className="h-4 w-8 rounded bg-white/10 mx-auto" /></td>
      <td className="px-4 py-3 text-center"><div className="h-4 w-8 rounded bg-white/10 mx-auto" /></td>
      <td className="px-4 py-3 text-center"><div className="h-4 w-12 rounded bg-white/10 mx-auto" /></td>
      <td className="px-4 py-3 text-center"><div className="h-5 w-16 rounded-full bg-white/10 mx-auto" /></td>
    </tr>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULT_REWARD_POOL = [
  { rank: 1, pts: 750 },
  { rank: 2, pts: 450 },
  { rank: 3, pts: 200 },
]

const PERIOD_OPTIONS: { value: ReferralLeaderboardPeriod; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "month", label: "This Month" },
  { value: "week", label: "This Week" },
]

interface Props {
  /** Wallet address of the connected player (used to highlight their row). */
  playerAddress?: string
}

export function ReferralLeaderboardTable({ playerAddress }: Props) {
  const [period, setPeriod] = useState<ReferralLeaderboardPeriod>("all")
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (p: ReferralLeaderboardPeriod) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchReferralLeaderboard(p, playerAddress)
        setData(res)
      } catch {
        setError("Could not load referral leaderboard. Please try again.")
      } finally {
        setLoading(false)
      }
    },
    [playerAddress]
  )

  useEffect(() => {
    void load(period)
  }, [period, load])

  return (
    <section aria-label="Referral leaderboard" data-testid="referral-leaderboard">
      {/* Header + period toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-400" />
            Referral Leaderboard
          </h2>
          <p className="text-zinc-400 text-sm mt-0.5">
            Top players ranked by successful referrals
          </p>
        </div>
        <div
          className="flex rounded-xl bg-white/5 border border-white/10 overflow-hidden"
          role="tablist"
          aria-label="Period filter"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              role="tab"
              aria-selected={period === opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                period === opt.value
                  ? "bg-violet-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats + reward pool */}
      {data && !loading && (
        <StatsCard stats={data.stats} rewardPool={DEFAULT_REWARD_POOL} />
      )}

      {/* Player's own rank callout */}
      {data?.playerRank && (
        <div
          className="mb-4 flex items-center gap-3 rounded-xl border border-violet-600/50 bg-violet-900/20 px-4 py-3"
          data-testid="player-rank-callout"
        >
          <RankBadge rank={data.playerRank.rank} />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-zinc-400">Your referral rank</div>
            <div className="text-sm font-semibold text-violet-300">
              #{data.playerRank.rank} — {data.playerRank.successfulReferrals} successful referrals
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-300 mb-4">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
        <table className="w-full text-sm" data-testid="referral-leaderboard-table">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-left text-xs text-zinc-500 uppercase tracking-wide w-12">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs text-zinc-500 uppercase tracking-wide">
                Referrer
              </th>
              <th className="px-4 py-3 text-center text-xs text-zinc-500 uppercase tracking-wide">
                Successful
              </th>
              <th className="px-4 py-3 text-center text-xs text-zinc-500 uppercase tracking-wide">
                Invites
              </th>
              <th className="px-4 py-3 text-center text-xs text-zinc-500 uppercase tracking-wide">
                Bonus Pts
              </th>
              <th className="px-4 py-3 text-center text-xs text-zinc-500 uppercase tracking-wide">
                Reward
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : data?.leaderboard.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    No referrals recorded yet. Share your link to get started!
                  </td>
                </tr>
              )
              : data?.leaderboard.map((entry) => {
                  const isCurrentPlayer =
                    playerAddress &&
                    entry.referrerAddress.toLowerCase() === playerAddress.toLowerCase()
                  return (
                    <tr
                      key={entry.referrerAddress}
                      data-testid={`leaderboard-row-${entry.rank}`}
                      className={`border-b border-white/5 transition-colors ${
                        isCurrentPlayer
                          ? "bg-violet-900/30 border-violet-600/30"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <RankBadge rank={entry.rank} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono text-sm ${
                            isCurrentPlayer ? "text-violet-300 font-semibold" : "text-zinc-200"
                          }`}
                          title={entry.referrerAddress}
                        >
                          {entry.displayName ?? shortenAddress(entry.referrerAddress)}
                          {isCurrentPlayer && (
                            <span className="ml-1.5 text-xs text-violet-400">(you)</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-emerald-400 font-semibold">
                        {entry.successfulReferrals}
                      </td>
                      <td className="px-4 py-3 text-center text-zinc-300">
                        {entry.totalInvites}
                      </td>
                      <td className="px-4 py-3 text-center text-violet-300 font-semibold">
                        {entry.bonusPoints}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <PayoutBadge
                          status={entry.rewardPayoutStatus}
                          amount={entry.rewardAmount}
                        />
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
