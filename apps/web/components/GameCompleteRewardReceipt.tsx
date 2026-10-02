import type { RewardReceipt } from "@/lib/types"

export function GameCompleteRewardReceipt({
  rewardReceipt,
}: {
  rewardReceipt: RewardReceipt
}) {
  return (
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
  )
}
