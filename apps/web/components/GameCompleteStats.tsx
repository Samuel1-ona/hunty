import { Clock3, Lightbulb, Medal } from "lucide-react"
import Coin from "@/components/icons/Coin"
import { useXlmUsdPrice } from "@/hooks/useXlmUsdPrice"
import type { HuntAttemptRecord, RewardReceipt } from "@/lib/types"
import { formatDuration } from "@/lib/huntAttemptHistory"

interface GameCompleteStatsProps {
  latestAttempt: HuntAttemptRecord | null
  reward: number
  rewardReceipt?: RewardReceipt | null
}

export function GameCompleteStats({
  latestAttempt,
  reward,
  rewardReceipt,
}: GameCompleteStatsProps) {
  const { price: xlmUsdPrice } = useXlmUsdPrice()

  const currencyFormatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  })

  const usdEquivalent =
    xlmUsdPrice != null ? currencyFormatter.format(reward * xlmUsdPrice) : null

  const completionTimeLabel = latestAttempt
    ? formatDuration(latestAttempt.totalTimeSeconds)
    : "—"

  const totalHintsUsed = latestAttempt
    ? latestAttempt.clues.reduce((sum, c) => sum + (c.hintsUsed ?? 0), 0)
    : 0

  // Rank is not tracked locally; show a dash until the leaderboard is opened
  const rankLabel = "—"

  return (
    <>
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="rounded-lg bg-white p-2 text-center">
          <div className="mx-auto mb-1 w-fit rounded-full bg-indigo-100 p-1.5 text-indigo-700">
            <Clock3 className="h-3.5 w-3.5" />
          </div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Time</p>
          <p className="text-xs font-semibold text-slate-800">{completionTimeLabel}</p>
        </div>
        <div className="rounded-lg bg-white p-2 text-center">
          <div className="mx-auto mb-1 w-fit rounded-full bg-amber-100 p-1.5 text-amber-700">
            <Lightbulb className="h-3.5 w-3.5" />
          </div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Hints</p>
          <p className="text-xs font-semibold text-slate-800">{totalHintsUsed}</p>
        </div>
        <div className="rounded-lg bg-white p-2 text-center">
          <div className="mx-auto mb-1 w-fit rounded-full bg-emerald-100 p-1.5 text-emerald-700">
            <Medal className="h-3.5 w-3.5" />
          </div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Rank</p>
          <p className="text-xs font-semibold text-slate-800">{rankLabel}</p>
        </div>
      </div>

      {/* Reward */}
      <div className="flex items-center justify-center gap-2 w-full">
        <p className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent text-xl font-normal mb-2">
          You won
        </p>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-center gap-2 bg-[#e5e5eb] p-2 rounded-xl w-[230px]">
            <Coin />
            <span className="font-bold text-lg">{reward}</span>
          </div>
          {usdEquivalent && (
            <span className="text-sm text-slate-500">≈ {usdEquivalent}</span>
          )}
        </div>
      </div>

      {/* Reward receipt */}
      {rewardReceipt && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left">
          <p className="text-sm font-semibold text-emerald-900">Reward receipt</p>
          <div className="mt-2 space-y-1 text-xs text-emerald-800">
            <p>
              Amount:{" "}
              <span className="font-semibold">{rewardReceipt.amount.toFixed(7)} XLM</span>
            </p>
            {rewardReceipt.rank && (
              <p>
                Winner rank:{" "}
                <span className="font-semibold">#{rewardReceipt.rank}</span>
              </p>
            )}
            <p className="break-all">
              Tx: <span className="font-mono">{rewardReceipt.txHash}</span>
            </p>
          </div>
        </div>
      )}
    </>
  )
}
